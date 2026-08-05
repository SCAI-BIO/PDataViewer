from types import TracebackType
from typing import Self

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from database.models import Base, BiomarkerMeasurement, Cohort, Concept, ConceptSource
from database.repositories import (
    AnalyticsRepository,
    BiomarkerRepository,
    CohortRepository,
    ConceptRepository,
    LongitudinalRepository,
)
from database.typeddicts import ChordDiagramData, LongitudinalMeasurementRecord


class PostgreSQLRepository:
    """Compatibility facade over domain-specific repositories."""

    def __init__(self, session: AsyncSession, engine: AsyncEngine | None = None) -> None:
        self.session = session
        self.engine = engine

        self.cohorts = CohortRepository(session)
        self.concepts = ConceptRepository(session, self.cohorts)
        self.longitudinal = LongitudinalRepository(session, self.cohorts)
        self.biomarkers = BiomarkerRepository(session, self.cohorts)
        self.analytics = AnalyticsRepository(session, self.cohorts)

    async def __aenter__(self) -> Self:
        """Enter the asynchronous repository context."""
        return self

    async def __aexit__(
        self, exc_type: type[BaseException] | None, exc_value: BaseException | None, traceback: TracebackType | None
    ) -> None:
        """Rollback failed work and close the shared session."""
        if exc_type is not None:
            await self.session.rollback()

        await self.close()

    async def get_cohorts(self) -> list[Cohort]:
        """Return all cohorts."""
        return await self.cohorts.get_all()

    async def get_cohort(self, name: str) -> Cohort:
        """Return a cohort by name."""
        return await self.cohorts.get_by_name(name)

    async def get_concepts(
        self, cohort_name: str | None = None, source_type: ConceptSource | None = None
    ) -> list[Concept]:
        """Return concepts matching the optional filters."""
        return await self.concepts.get_all(cohort_name=cohort_name, source_type=source_type)

    async def get_modalities(self) -> list[str]:
        """Return all mapping modalities."""
        return await self.concepts.get_modalities()

    async def get_longitudinal_measurements(
        self, variable: str | None = None, cohort_name: str | None = None
    ) -> list[LongitudinalMeasurementRecord]:
        """Return longitudinal measurements."""
        return await self.longitudinal.get_all(variable=variable, cohort_name=cohort_name)

    async def get_longitudinal_measurement_variables(self) -> list[str]:
        """Return all longitudinal variables."""
        return await self.longitudinal.get_variables()

    async def get_biomarker_measurements(
        self, variable: str | None = None, cohort_name: str | None = None, diagnosis: str | None = None
    ) -> list[BiomarkerMeasurement]:
        """Return biomarker measurements."""
        return await self.biomarkers.get_all(variable=variable, cohort_name=cohort_name, diagnosis=diagnosis)

    async def get_biomarker_variables(self) -> list[str]:
        """Return all biomarker variables."""
        return await self.biomarkers.get_variables()

    async def get_cohorts_for_biomarker(self, variable: str) -> list[str]:
        """Return cohorts that contain a biomarker."""
        return await self.biomarkers.get_cohorts_for_variable(variable)

    async def get_diagnoses_for_biomarker_in_cohort(self, variable: str, cohort_name: str) -> list[str]:
        """Return diagnoses for a biomarker and cohort."""
        return await self.biomarkers.get_diagnoses(variable, cohort_name)

    async def import_metadata(self, csv_data: bytes) -> None:
        """Import cohort metadata."""
        await self.cohorts.import_metadata(csv_data)

    async def import_cdm(self, csv_data: bytes, modality: str, columns_to_ignore: list[str] | None = None) -> None:
        """Import a CDM modality."""
        await self.concepts.import_cdm(csv_data, modality, columns_to_ignore)

    async def import_longitudinal_measurements(self, csv_data: bytes, variable_name: str) -> None:
        """Import longitudinal measurements."""
        await self.longitudinal.import_measurements(csv_data, variable_name)

    async def import_biomarker_measurements(self, csv_data: bytes, variable_name: str) -> None:
        """Import biomarker measurements."""
        await self.biomarkers.import_measurements(csv_data, variable_name)

    async def get_chord_diagram(self, modality: str) -> ChordDiagramData:
        """Return chord-diagram data for a modality."""
        return await self.analytics.get_chord_diagram(modality)

    async def rank_cohorts(self, variables: list[str]) -> pd.DataFrame:
        """Rank cohorts by requested variable availability."""
        return await self.analytics.rank_cohorts(variables)

    async def clear_all(self) -> None:
        """Drop and recreate all registered database tables."""
        if self.engine is None:
            raise RuntimeError("Engine must be provided during repository " "initialization to use clear_all()")

        await self.session.rollback()
        await self.session.close()

        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)
            await connection.run_sync(Base.metadata.create_all)

    async def close(self) -> None:
        """Close the shared database session."""
        await self.session.close()
