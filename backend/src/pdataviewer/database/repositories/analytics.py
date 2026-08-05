from collections import defaultdict
from collections.abc import Iterable
from itertools import combinations
from typing import TypeAlias

import pandas as pd
from sqlalchemy import select
from sqlalchemy.engine import RowMapping
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from pdataviewer.database.import_utils import required_string
from pdataviewer.database.models import Cohort, Concept, ConceptSource, Mapping
from pdataviewer.database.repositories.base import BaseRepository
from pdataviewer.database.repositories.cohorts import CohortRepository
from pdataviewer.database.typeddicts import ChordDiagramData, ChordLink, ChordNode

StudyVariable: TypeAlias = tuple[str, str]
VariablesByCdm: TypeAlias = dict[str, list[StudyVariable]]


def _build_chord_statement(modality: str):
    """Build the query used to retrieve CDM-to-cohort mappings."""
    cohort_concept = aliased(Concept)

    return (
        select(
            Concept.variable.label("cdm_variable"),
            cohort_concept.variable.label("cohort_variable"),
            Cohort.name.label("cohort"),
        )
        .join(Mapping, Mapping.source_id == Concept.id)
        .join(cohort_concept, Mapping.target_id == cohort_concept.id)
        .join(Cohort, cohort_concept.cohort_id == Cohort.id)
        .where(
            Concept.source_type == ConceptSource.CDM,
            cohort_concept.source_type == ConceptSource.COHORT,
            Mapping.modality == modality,
        )
    )


def _group_variables_by_cdm(rows: Iterable[RowMapping]) -> VariablesByCdm:
    """Group unique cohort variables by their mapped CDM concept."""
    variables_by_cdm: dict[str, list[StudyVariable]] = defaultdict(list)
    seen_by_cdm: dict[str, set[StudyVariable]] = defaultdict(set)

    for row in rows:
        cdm_variable = str(row["cdm_variable"]).strip()
        cohort_variable = str(row["cohort_variable"]).strip()
        cohort = str(row["cohort"]).strip()

        if not cdm_variable or not cohort_variable or not cohort:
            continue

        study_variable = (cohort_variable, cohort)

        if study_variable in seen_by_cdm[cdm_variable]:
            continue

        seen_by_cdm[cdm_variable].add(study_variable)
        variables_by_cdm[cdm_variable].append(study_variable)

    return dict(variables_by_cdm)


def _add_chord_nodes(
    study_variables: list[StudyVariable], seen_nodes: set[StudyVariable], nodes: list[ChordNode]
) -> None:
    """Add previously unseen cohort-variable nodes."""
    for variable, cohort in study_variables:
        node_key = (variable, cohort)

        if node_key in seen_nodes:
            continue

        seen_nodes.add(node_key)
        nodes.append(ChordNode(name=variable, group=cohort))


def _add_chord_links(
    study_variables: list[StudyVariable], seen_links: set[tuple[str, str]], links: list[ChordLink]
) -> None:
    """Add unique links between variables from different cohorts."""
    for left, right in combinations(study_variables, 2):
        left_variable, left_cohort = left
        right_variable, right_cohort = right

        if left_cohort == right_cohort:
            continue

        source, target = sorted((left_variable, right_variable))
        link_key = (source, target)

        if source == target or link_key in seen_links:
            continue

        seen_links.add(link_key)
        links.append(ChordLink(source=source, target=target))


def _build_chord_data(variables_by_cdm: VariablesByCdm) -> ChordDiagramData:
    """Build deduplicated chord-diagram nodes and links."""
    seen_nodes: set[StudyVariable] = set()
    seen_links: set[tuple[str, str]] = set()

    nodes: list[ChordNode] = []
    links: list[ChordLink] = []

    for study_variables in variables_by_cdm.values():
        represented_cohorts = {cohort for _, cohort in study_variables}

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
        """Build chord-diagram nodes and links for a modality."""
        validated_modality = required_string(modality, field_name="modality")
        statement = _build_chord_statement(validated_modality)
        result = await self.session.execute(statement)
        variables_by_cdm = _group_variables_by_cdm(result.mappings().all())
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

        existing_variables = set(existing_result.scalars().all())
        unknown_variables = [variable for variable in requested_variables if variable not in existing_variables]

        if unknown_variables:
            unknown = ", ".join(unknown_variables)

            raise ValueError("Requested CDM variables do not exist in the " f"database: {unknown}")

        cohort_concept = aliased(Concept)

        mapping_result = await self.session.execute(
            select(Concept.variable, Cohort.name)
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

        for variable, cohort_name in mapping_result.all():
            found_by_cohort[cohort_name].add(variable)

        total_variables = len(requested_variables)
        rows: list[tuple[int, str, dict[str, str]]] = []

        for cohort in await self.cohort_repository.get_all():
            found_variables = found_by_cohort.get(cohort.name, set())
            found_count = len(found_variables)

            if found_count == 0:
                continue

            missing_variables = [variable for variable in requested_variables if variable not in found_variables]
            percentage = round(found_count / total_variables * 100, 2)

            rows.append(
                (
                    found_count,
                    cohort.name.casefold(),
                    {
                        "cohort": cohort.name,
                        "found": (f"{found_count}/{total_variables} " f"({percentage}%)"),
                        "missing": ", ".join(missing_variables),
                    },
                )
            )

        rows.sort(key=lambda row: (-row[0], row[1]))
        return pd.DataFrame([row_data for _, _, row_data in rows], columns=["cohort", "found", "missing"])
