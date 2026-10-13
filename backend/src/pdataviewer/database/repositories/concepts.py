from collections.abc import Collection
from dataclasses import dataclass
from itertools import batched
from typing import TypedDict

import pandas as pd
from sqlalchemy import select, tuple_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from pdataviewer.database.import_utils import optional_string, read_csv_bytes, require_columns, required_string
from pdataviewer.database.models import Concept, ConceptSource, Mapping
from pdataviewer.database.repositories.base import BaseRepository
from pdataviewer.database.repositories.cohorts import CohortRepository

CONCEPT_BATCH_SIZE = 1000
MAPPING_BATCH_SIZE = 1000
DEFAULT_IGNORED_CDM_COLUMNS: frozenset[str] = frozenset(
    {"Feature", "CURIE", "Definition", "Synonyms", "OMOP", "UMLS", "UK Biobank", "Rank"}
)

type CohortConceptKey = tuple[str, int]


@dataclass(frozen=True, slots=True)
class RawMapping:
    """A mapping from a CDM variable to a cohort variable, before ID resolution."""

    cdm_variable: str
    cohort_name: str
    cohort_variable: str


class ConceptInsert(TypedDict):
    """Validated values for one concept insert."""

    variable: str
    source_type: ConceptSource
    cohort_id: int | None


class MappingInsert(TypedDict):
    """Resolved database identifiers for one CDM-to-cohort mapping."""

    source_id: int
    target_id: int
    modality: str


class ConceptRepository(BaseRepository):
    """Read and import concepts and mappings."""

    def __init__(self, session: AsyncSession, cohort_repository: CohortRepository) -> None:
        super().__init__(session)
        self.cohort_repository = cohort_repository

    async def get_modalities(self) -> list[str]:
        """Return all distinct mapping modalities."""
        result = await self.session.scalars(select(Mapping.modality).distinct().order_by(Mapping.modality))
        return list(result)

    async def get_variable_names(self, source_type: ConceptSource | None = None) -> list[str]:
        """Return unique concept variable names, optionally filtered by source."""
        statement = select(Concept.variable).distinct().order_by(Concept.variable)

        if source_type is not None:
            statement = statement.where(Concept.source_type == source_type)

        result = await self.session.scalars(statement)
        return list(result)

    async def import_cdm(
        self, csv_data: bytes, modality: str, columns_to_ignore: Collection[str] | None = None
    ) -> None:
        """Add concepts and mappings for a modality in one transaction.

        Existing concepts and mappings are retained; this is an additive import,
        not a replacement of a modality. Identical mappings are deduplicated.
        Non-ignored columns must match registered cohort names exactly. A custom
        ignore collection replaces the defaults, but Feature is always metadata.

        Blank features are skipped only when they have no mapping terms. An
        upload with no features or mappings is a no-op. CSV values are read as
        strings, retaining pandas' default missing-value markers.

        Use a session dedicated to this import: this method owns commit and
        rollback. The database's uq_variable_source_cohort constraint must use
        NULLS NOT DISTINCT, as configured by the Concept model on PostgreSQL 15+.
        """
        modality = required_string(modality, field_name="modality")

        if isinstance(columns_to_ignore, str):
            raise ValueError("columns_to_ignore must be a collection of column names, not a string")

        source_name = f"{modality} CDM CSV"
        dataframe = read_csv_bytes(csv_data, source_name=source_name, dtype="string")
        require_columns(dataframe, {"Feature"}, source_name=source_name)
        ignored_columns = set(DEFAULT_IGNORED_CDM_COLUMNS if columns_to_ignore is None else columns_to_ignore)
        ignored_columns.add("Feature")
        cohort_columns: list[str] = [column for column in dataframe.columns if column not in ignored_columns]
        cdm_variables, raw_mappings = self._prepare_import(dataframe, cohort_columns)

        if not cdm_variables:
            return

        try:
            cohort_map = await self.cohort_repository.get_name_to_id_map()
            unknown_columns = sorted(set(cohort_columns).difference(cohort_map))

            if unknown_columns:
                raise ValueError(
                    f"{source_name} has unrecognized cohort columns: {', '.join(unknown_columns)}. "
                    "Import cohort metadata first or include metadata columns in columns_to_ignore."
                )

            cohort_concepts = {(mapping.cohort_variable, cohort_map[mapping.cohort_name]) for mapping in raw_mappings}

            await self._insert_cdm_concepts(cdm_variables)
            cdm_concept_map = await self._get_cdm_concept_map(cdm_variables)
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

    @classmethod
    def _prepare_import(cls, dataframe: pd.DataFrame, cohort_columns: list[str]) -> tuple[list[str], set[RawMapping]]:
        """Normalize and deduplicate CSV content before any database writes."""
        variables: set[str] = set()
        raw_mappings: set[RawMapping] = set()
        rows = dataframe.loc[:, ["Feature", *cohort_columns]].itertuples(index=False, name=None)

        for row_number, row in enumerate(rows, start=2):
            cdm_variable = optional_string(row[0])
            terms_by_cohort = [
                (cohort_name, cls._split_mapping_values(value))
                for cohort_name, value in zip(cohort_columns, row[1:], strict=True)
            ]

            if cdm_variable is None:
                if any(terms for _, terms in terms_by_cohort):
                    raise ValueError(f"Invalid CDM CSV row {row_number}: Feature is missing but mappings are present")

                continue

            variables.add(cdm_variable)

            for cohort_name, terms in terms_by_cohort:
                raw_mappings.update(
                    RawMapping(cdm_variable=cdm_variable, cohort_name=cohort_name, cohort_variable=variable)
                    for variable in terms
                )

        return sorted(variables), raw_mappings

    @staticmethod
    def _split_mapping_values(value: object) -> list[str]:
        """Split comma-separated terms, removing blanks and repeated terms."""
        text = optional_string(value)

        if text is None:
            return []

        terms = (part.strip() for part in text.split(","))
        return list(dict.fromkeys(term for term in terms if term))

    async def _insert_cdm_concepts(self, variables: list[str]) -> None:
        """Insert CDM concepts in bounded batches, retaining existing IDs."""
        for batch in batched(variables, CONCEPT_BATCH_SIZE, strict=False):
            values = [
                ConceptInsert(variable=variable, source_type=ConceptSource.CDM, cohort_id=None) for variable in batch
            ]
            statement = (
                pg_insert(Concept).values(values).on_conflict_do_nothing(constraint="uq_variable_source_cohort")
            )
            await self.session.execute(statement)

    async def _get_cdm_concept_map(self, variables: list[str]) -> dict[str, int]:
        """Resolve every CDM concept and detect a missing or outdated constraint."""
        concept_map: dict[str, int] = {}

        for batch in batched(variables, CONCEPT_BATCH_SIZE, strict=False):
            result = await self.session.execute(
                select(Concept.variable, Concept.id).where(
                    Concept.source_type == ConceptSource.CDM,
                    Concept.cohort_id.is_(None),
                    Concept.variable.in_(batch),
                )
            )

            for variable, concept_id in result:
                if variable in concept_map:
                    raise RuntimeError(
                        f"Multiple CDM concepts exist for {variable!r}. "
                        "Check existing duplicates and ensure uq_variable_source_cohort uses NULLS NOT DISTINCT."
                    )

                concept_map[variable] = concept_id

        missing = set(variables).difference(concept_map)

        if missing:
            raise RuntimeError(f"Could not resolve CDM concepts after insertion: {', '.join(sorted(missing))}")

        return concept_map

    async def _insert_cohort_concepts(self, concepts: set[CohortConceptKey]) -> None:
        """Insert cohort concepts in a consistent order and bounded batches."""
        for batch in batched(sorted(concepts), CONCEPT_BATCH_SIZE, strict=False):
            values = [
                ConceptInsert(variable=variable, source_type=ConceptSource.COHORT, cohort_id=cohort_id)
                for variable, cohort_id in batch
            ]
            statement = (
                pg_insert(Concept).values(values).on_conflict_do_nothing(constraint="uq_variable_source_cohort")
            )
            await self.session.execute(statement)

    async def _get_cohort_concept_map(self, concepts: set[CohortConceptKey]) -> dict[CohortConceptKey, int]:
        """Resolve only the requested variable/cohort pairs in bounded queries."""
        concept_map: dict[CohortConceptKey, int] = {}

        for batch in batched(sorted(concepts), CONCEPT_BATCH_SIZE, strict=False):
            result = await self.session.execute(
                select(Concept.variable, Concept.cohort_id, Concept.id).where(
                    Concept.source_type == ConceptSource.COHORT,
                    tuple_(Concept.variable, Concept.cohort_id).in_(batch),
                )
            )

            for variable, cohort_id, concept_id in result:
                if cohort_id is None:
                    raise RuntimeError(f"Cohort concept {concept_id} has no cohort ID")

                key = (variable, cohort_id)

                if key in concept_map:
                    raise RuntimeError(f"Multiple cohort concepts exist for {key!r}")

                concept_map[key] = concept_id

        missing = concepts.difference(concept_map)

        if missing:
            raise RuntimeError(f"Could not resolve cohort concepts after insertion: {sorted(missing)!r}")

        return concept_map

    async def _insert_mappings(
        self,
        *,
        raw_mappings: set[RawMapping],
        modality: str,
        cohort_map: dict[str, int],
        cdm_concept_map: dict[str, int],
        cohort_concept_map: dict[CohortConceptKey, int],
    ) -> None:
        """Insert deduplicated CDM-to-cohort mappings without skipping unresolved IDs."""
        ordered_mappings = sorted(
            raw_mappings, key=lambda mapping: (mapping.cdm_variable, mapping.cohort_name, mapping.cohort_variable)
        )

        for batch in batched(ordered_mappings, MAPPING_BATCH_SIZE, strict=False):
            values = [
                MappingInsert(
                    source_id=cdm_concept_map[mapping.cdm_variable],
                    target_id=cohort_concept_map[(mapping.cohort_variable, cohort_map[mapping.cohort_name])],
                    modality=modality,
                )
                for mapping in batch
            ]
            statement = (
                pg_insert(Mapping)
                .values(values)
                .on_conflict_do_nothing(constraint="uq_mapping_source_target_modality")
            )
            await self.session.execute(statement)
