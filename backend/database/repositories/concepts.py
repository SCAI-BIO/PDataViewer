from collections.abc import Collection
from dataclasses import dataclass
from typing import Any

import pandas as pd
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from database.import_utils import is_missing_scalar, read_csv_bytes, require_columns, required_string
from database.models import Concept, ConceptSource, Mapping
from database.repositories.base import BaseRepository
from database.repositories.cohorts import CohortRepository

DEFAULT_IGNORED_CDM_COLUMNS = frozenset(
    {"Feature", "CURIE", "Definition", "Synonyms", "OMOP", "UMLS", "UK Biobank", "Rank"}
)


@dataclass(frozen=True, slots=True)
class RawMapping:
    """A validated mapping before database identifiers are resolved."""

    cdm_variable: str
    cohort_name: str
    cohort_variable: str


class ConceptRepository(BaseRepository):
    """Read and import concepts and mappings."""

    def __init__(self, session: AsyncSession, cohort_repository: CohortRepository) -> None:
        super().__init__(session)
        self.cohort_repository = cohort_repository

    async def get_modalities(self) -> list[str]:
        """Return all distinct mapping modalities."""
        result = await self.session.execute(select(Mapping.modality).distinct().order_by(Mapping.modality))
        return list(result.scalars().all())

    async def get_variable_names(self, source_type: ConceptSource | None = None) -> list[str]:
        """Return unique concept variable names."""
        statement = select(Concept.variable).distinct().order_by(Concept.variable)

        if source_type is not None:
            statement = statement.where(Concept.source_type == source_type)

        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def import_cdm(
        self, csv_data: bytes, modality: str, columns_to_ignore: Collection[str] | None = None
    ) -> None:
        """Import one CDM modality and its cohort mappings."""
        modality = required_string(modality, field_name="modality")
        dataframe = read_csv_bytes(csv_data, source_name=f"{modality} CDM CSV")
        require_columns(dataframe, {"Feature"}, source_name=f"{modality} CDM CSV")
        ignored_columns = set(DEFAULT_IGNORED_CDM_COLUMNS if columns_to_ignore is None else columns_to_ignore)

        try:
            cohort_map = await self.cohort_repository.get_name_to_id_map()
            valid_cohort_columns = [
                column for column in dataframe.columns if column not in ignored_columns and column in cohort_map
            ]

            cdm_variables = self._extract_cdm_variables(dataframe)

            if not cdm_variables:
                await self.session.commit()
                return

            await self._insert_cdm_concepts(cdm_variables)
            cdm_concept_map = await self._get_cdm_concept_map(cdm_variables)

            cohort_concepts, raw_mappings = self._collect_cohort_mappings(
                dataframe=dataframe,
                valid_cohort_columns=valid_cohort_columns,
                cohort_map=cohort_map,
                cdm_concept_map=cdm_concept_map,
            )

            await self._insert_cohort_concepts(cohort_concepts)
            cohort_concept_map = await self._get_cohort_concept_map(cohort_concepts)

            await self._insert_mappings(
                raw_mappings=raw_mappings,
                modality=modality,
                cohort_map=cohort_map,
                cdm_concept_map=cdm_concept_map,
                cohort_concept_map=cohort_concept_map,
            )
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

    @staticmethod
    def _extract_cdm_variables(dataframe: pd.DataFrame) -> list[str]:
        variables: list[str] = []
        seen: set[str] = set()

        for value in dataframe["Feature"]:
            if is_missing_scalar(value):
                continue

            variable = str(value).strip()

            if variable and variable not in seen:
                seen.add(variable)
                variables.append(variable)

        return variables

    async def _insert_cdm_concepts(self, variables: list[str]) -> None:
        concepts = [
            {"variable": variable, "source_type": ConceptSource.CDM, "cohort_id": None} for variable in variables
        ]

        statement = pg_insert(Concept).values(concepts).on_conflict_do_nothing(constraint="uq_variable_source_cohort")
        await self.session.execute(statement)

    async def _get_cdm_concept_map(self, variables: list[str]) -> dict[str, int]:
        result = await self.session.execute(
            select(Concept.variable, Concept.id).where(
                Concept.source_type == ConceptSource.CDM, Concept.variable.in_(variables)
            )
        )
        return {variable: concept_id for variable, concept_id in result.all()}

    @classmethod
    def _collect_cohort_mappings(
        cls,
        *,
        dataframe: pd.DataFrame,
        valid_cohort_columns: list[str],
        cohort_map: dict[str, int],
        cdm_concept_map: dict[str, int],
    ) -> tuple[set[tuple[str, int]], set[RawMapping]]:
        column_indices = {column: index for index, column in enumerate(dataframe.columns)}
        feature_index = column_indices["Feature"]

        cohort_concepts: set[tuple[str, int]] = set()
        raw_mappings: set[RawMapping] = set()

        for row in dataframe.itertuples(index=False, name=None):
            feature_value = row[feature_index]

            if is_missing_scalar(feature_value):
                continue

            cdm_variable = str(feature_value).strip()

            if cdm_variable not in cdm_concept_map:
                continue

            for cohort_name in valid_cohort_columns:
                cohort_id = cohort_map[cohort_name]
                cell_value = row[column_indices[cohort_name]]

                for cohort_variable in cls._split_mapping_values(cell_value):
                    cohort_concepts.add((cohort_variable, cohort_id))
                    raw_mappings.add(
                        RawMapping(cdm_variable=cdm_variable, cohort_name=cohort_name, cohort_variable=cohort_variable)
                    )

        return cohort_concepts, raw_mappings

    @staticmethod
    def _split_mapping_values(value: Any) -> list[str]:
        if is_missing_scalar(value):
            return []

        return list(dict.fromkeys(part.strip() for part in str(value).split(",") if part.strip()))

    async def _insert_cohort_concepts(self, concepts: set[tuple[str, int]]) -> None:
        if not concepts:
            return

        values = [
            {"variable": variable, "source_type": ConceptSource.COHORT, "cohort_id": cohort_id}
            for variable, cohort_id in concepts
        ]

        statement = pg_insert(Concept).values(values).on_conflict_do_nothing(constraint="uq_variable_source_cohort")
        await self.session.execute(statement)

    async def _get_cohort_concept_map(self, concepts: set[tuple[str, int]]) -> dict[tuple[str, int], int]:
        if not concepts:
            return {}

        variables = {variable for variable, _ in concepts}
        cohort_ids = {cohort_id for _, cohort_id in concepts}

        result = await self.session.execute(
            select(Concept.variable, Concept.cohort_id, Concept.id).where(
                Concept.source_type == ConceptSource.COHORT,
                Concept.variable.in_(variables),
                Concept.cohort_id.in_(cohort_ids),
            )
        )

        return {
            (variable, cohort_id): concept_id
            for variable, cohort_id, concept_id in result.all()
            if cohort_id is not None
        }

    async def _insert_mappings(
        self,
        *,
        raw_mappings: set[RawMapping],
        modality: str,
        cohort_map: dict[str, int],
        cdm_concept_map: dict[str, int],
        cohort_concept_map: dict[tuple[str, int], int],
    ) -> None:
        mappings: dict[tuple[int, int, str], dict[str, int | str]] = {}

        for raw_mapping in raw_mappings:
            source_id = cdm_concept_map.get(raw_mapping.cdm_variable)
            cohort_id = cohort_map.get(raw_mapping.cohort_name)

            if source_id is None or cohort_id is None:
                continue

            target_id = cohort_concept_map.get((raw_mapping.cohort_variable, cohort_id))

            if target_id is None:
                continue

            key = (source_id, target_id, modality)
            mappings[key] = {"source_id": source_id, "target_id": target_id, "modality": modality}

        if not mappings:
            return

        statement = (
            pg_insert(Mapping)
            .values(list(mappings.values()))
            .on_conflict_do_nothing(constraint=("uq_mapping_source_target_modality"))
        )
        await self.session.execute(statement)
