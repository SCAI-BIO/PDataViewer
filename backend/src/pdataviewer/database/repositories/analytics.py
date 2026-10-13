from collections import defaultdict
from collections.abc import Iterable
from itertools import combinations
from typing import TypedDict

import pandas as pd
from sqlalchemy import Select, select
from sqlalchemy.engine import RowMapping
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from pdataviewer.database.import_utils import required_string
from pdataviewer.database.models import Cohort, Concept, ConceptSource, Mapping
from pdataviewer.database.repositories.base import BaseRepository
from pdataviewer.database.repositories.cohorts import CohortRepository

# Concept ID, display variable, cohort name.
type StudyVariable = tuple[str, str, str]
type VariablesByCdm = dict[str, list[StudyVariable]]


class ChordNode(TypedDict):
    id: str
    name: str
    group: str


class ChordLink(TypedDict):
    source: str
    target: str


class ChordDiagramData(TypedDict):
    nodes: list[ChordNode]
    links: list[ChordLink]


def _build_chord_statement(modality: str) -> Select[str, int, str, str]:
    """Retrieve CDM mappings with unambiguous cohort-concept identifiers."""
    cohort_concept = aliased(Concept)

    return (
        select(
            Concept.variable.label("cdm_variable"),
            cohort_concept.id.label("cohort_concept_id"),
            cohort_concept.variable.label("cohort_variable"),
            Cohort.name.label("cohort"),
        )
        .select_from(Concept)
        .join(Mapping, Mapping.source_id == Concept.id)
        .join(cohort_concept, Mapping.target_id == cohort_concept.id)
        .join(Cohort, cohort_concept.cohort_id == Cohort.id)
        .where(
            Concept.source_type == ConceptSource.CDM,
            cohort_concept.source_type == ConceptSource.COHORT,
            Mapping.modality == modality,
        )
        .order_by(Concept.variable, Cohort.name, cohort_concept.variable, cohort_concept.id)
    )


def _group_variables_by_cdm(rows: Iterable[RowMapping]) -> VariablesByCdm:
    """Group distinct cohort concepts by their mapped CDM variable."""
    variables_by_cdm: dict[str, list[StudyVariable]] = defaultdict(list)
    seen_by_cdm: dict[str, set[str]] = defaultdict(set)

    for row in rows:
        cdm_variable = str(row["cdm_variable"]).strip()
        cohort_variable = str(row["cohort_variable"]).strip()
        cohort = str(row["cohort"]).strip()

        if not cdm_variable or not cohort_variable or not cohort:
            continue

        node_id = str(row["cohort_concept_id"])

        if node_id in seen_by_cdm[cdm_variable]:
            continue

        seen_by_cdm[cdm_variable].add(node_id)
        variables_by_cdm[cdm_variable].append((node_id, cohort_variable, cohort))

    return dict(variables_by_cdm)


def _add_chord_nodes(study_variables: list[StudyVariable], seen_nodes: set[str], nodes: list[ChordNode]) -> None:
    """Add previously unseen cohort concepts, retaining labels for display."""
    for node_id, variable, cohort in study_variables:
        if node_id in seen_nodes:
            continue

        seen_nodes.add(node_id)
        nodes.append(ChordNode(id=node_id, name=variable, group=cohort))


def _add_chord_links(
    study_variables: list[StudyVariable], seen_links: set[tuple[str, str]], links: list[ChordLink]
) -> None:
    """Add unique cross-cohort links whose endpoints are concept IDs."""
    for left, right in combinations(study_variables, 2):
        left_id, _, left_cohort = left
        right_id, _, right_cohort = right

        if left_cohort == right_cohort:
            continue

        source, target = sorted((left_id, right_id))
        link_key = (source, target)

        if source == target or link_key in seen_links:
            continue

        seen_links.add(link_key)
        links.append(ChordLink(source=source, target=target))


def _build_chord_data(variables_by_cdm: VariablesByCdm) -> ChordDiagramData:
    """Build nodes and links without merging concepts that share a label."""
    seen_nodes: set[str] = set()
    seen_links: set[tuple[str, str]] = set()
    nodes: list[ChordNode] = []
    links: list[ChordLink] = []

    for study_variables in variables_by_cdm.values():
        represented_cohorts = {cohort for _, _, cohort in study_variables}

        if len(represented_cohorts) < 2:
            continue

        _add_chord_nodes(study_variables, seen_nodes, nodes)
        _add_chord_links(study_variables, seen_links, links)

    return ChordDiagramData(nodes=nodes, links=links)


class AnalyticsRepository(BaseRepository):
    """Build database-backed analytics projections."""

    def __init__(self, session: AsyncSession, cohort_repository: CohortRepository) -> None:
        super().__init__(session)
        self.cohort_repository = cohort_repository

    async def get_chord_diagram(self, modality: str) -> ChordDiagramData:
        """Build chord data with string concept IDs as node and link identifiers."""
        validated_modality = required_string(modality, field_name="modality")
        statement = _build_chord_statement(validated_modality)
        result = await self.session.execute(statement)
        variables_by_cdm = _group_variables_by_cdm(result.mappings())
        return _build_chord_data(variables_by_cdm)

    async def rank_cohorts(self, variables: list[str]) -> pd.DataFrame:
        """Rank cohorts by availability of requested CDM variables."""
        requested_variables = list(dict.fromkeys(variable.strip() for variable in variables if variable.strip()))

        if not requested_variables:
            raise ValueError("The 'variables' list cannot be empty")

        existing_result = await self.session.execute(
            select(Concept.variable)
            .where(Concept.source_type == ConceptSource.CDM, Concept.variable.in_(requested_variables))
            .distinct()
        )

        existing_variables = set(existing_result.scalars())
        unknown_variables = [variable for variable in requested_variables if variable not in existing_variables]

        if unknown_variables:
            unknown = ", ".join(unknown_variables)
            raise ValueError(f"Requested CDM variables do not exist in the database: {unknown}")

        cohort_concept = aliased(Concept)

        mapping_result = await self.session.execute(
            select(Concept.variable, Cohort.name)
            .select_from(Concept)
            .join(Mapping, Mapping.source_id == Concept.id)
            .join(cohort_concept, Mapping.target_id == cohort_concept.id)
            .join(Cohort, cohort_concept.cohort_id == Cohort.id)
            .where(
                Concept.source_type == ConceptSource.CDM,
                cohort_concept.source_type == ConceptSource.COHORT,
                Concept.variable.in_(requested_variables),
            )
            .distinct()
        )

        found_by_cohort: dict[str, set[str]] = defaultdict(set)

        for variable, cohort_name in mapping_result:
            found_by_cohort[cohort_name].add(variable)

        total_variables = len(requested_variables)
        rows: list[tuple[int, str, dict[str, str]]] = []

        for cohort_name, found_variables in found_by_cohort.items():
            found_count = len(found_variables)
            missing_variables = [variable for variable in requested_variables if variable not in found_variables]
            percentage = round(found_count / total_variables * 100, 2)

            rows.append(
                (
                    found_count,
                    cohort_name.casefold(),
                    {
                        "cohort": cohort_name,
                        "found": f"{found_count}/{total_variables} ({percentage}%)",
                        "missing": ", ".join(missing_variables),
                    },
                )
            )

        rows.sort(key=lambda row: (-row[0], row[1], row[2]["cohort"]))
        return pd.DataFrame([row_data for _, _, row_data in rows], columns=["cohort", "found", "missing"])
