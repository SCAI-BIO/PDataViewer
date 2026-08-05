import logging
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from pdataviewer.database.import_utils import (
    read_csv_bytes,
    require_columns,
    required_float,
    required_int,
    required_string,
)
from pdataviewer.database.models import BiomarkerMeasurement, Cohort
from pdataviewer.database.repositories.base import BaseRepository
from pdataviewer.database.repositories.cohorts import CohortRepository

LOGGER = logging.getLogger(__name__)
BIOMARKER_BATCH_SIZE = 5000
REQUIRED_BIOMARKER_COLUMNS = {"participantNumber", "cohort", "measurement", "diagnosis"}


class BiomarkerRepository(BaseRepository):
    """Read and import participant-level biomarker measurements."""

    def __init__(self, session: AsyncSession, cohort_repository: CohortRepository) -> None:
        super().__init__(session)
        self.cohort_repository = cohort_repository

    async def get_variables(self) -> list[str]:
        """Return all distinct biomarker variables."""
        result = await self.session.execute(
            select(BiomarkerMeasurement.variable).distinct().order_by(BiomarkerMeasurement.variable)
        )

        return list(result.scalars().all())

    async def get_cohorts_for_variable(self, variable: str) -> list[str]:
        """Return cohorts that contain a biomarker variable."""
        result = await self.session.execute(
            select(Cohort.name)
            .join(BiomarkerMeasurement, Cohort.id == BiomarkerMeasurement.cohort_id)
            .where(BiomarkerMeasurement.variable == variable)
            .distinct()
            .order_by(Cohort.name)
        )

        return list(result.scalars().all())

    async def get_diagnoses_by_cohort(self, variable: str) -> dict[str, list[str]]:
        """Return diagnoses grouped by cohort for a biomarker."""
        result = await self.session.execute(
            select(Cohort.name, BiomarkerMeasurement.diagnosis)
            .join(BiomarkerMeasurement, Cohort.id == BiomarkerMeasurement.cohort_id)
            .where(BiomarkerMeasurement.variable == variable)
            .distinct()
            .order_by(Cohort.name, BiomarkerMeasurement.diagnosis)
        )

        diagnoses_by_cohort: dict[str, list[str]] = defaultdict(list)

        for cohort_name, diagnosis in result.all():
            diagnoses_by_cohort[cohort_name].append(diagnosis)

        return dict(diagnoses_by_cohort)

    async def get_measurement_values(
        self, variable: str, cohort_name: str, diagnosis: str | None = None
    ) -> list[float]:
        """Return measurement values matching the filters."""
        statement = (
            select(BiomarkerMeasurement.measurement)
            .join(Cohort, Cohort.id == BiomarkerMeasurement.cohort_id)
            .where(BiomarkerMeasurement.variable == variable, Cohort.name == cohort_name)
            .order_by(BiomarkerMeasurement.id)
        )

        if diagnosis is not None:
            statement = statement.where(BiomarkerMeasurement.diagnosis == diagnosis)

        result = await self.session.execute(statement)

        return list(result.scalars().all())

    async def import_measurements(self, csv_data: bytes, variable_name: str) -> None:
        """Import biomarker measurements in bounded batches."""
        variable_name = required_string(variable_name, field_name="variable_name")

        dataframe = read_csv_bytes(csv_data, source_name=f"{variable_name} biomarker CSV")
        require_columns(dataframe, REQUIRED_BIOMARKER_COLUMNS, source_name=f"{variable_name} biomarker CSV")
        column_indices = {column: index for index, column in enumerate(dataframe.columns)}

        try:
            cohort_map = await self.cohort_repository.get_name_to_id_map()

            batch: list[dict[str, int | float | str]] = []

            for row_number, row in enumerate(dataframe.itertuples(index=False, name=None), start=2):
                try:
                    cohort_name = required_string(row[column_indices["cohort"]], field_name="cohort")
                    cohort_id = cohort_map.get(cohort_name)

                    if cohort_id is None:
                        continue

                    batch.append(
                        {
                            "variable": variable_name,
                            "participant_id": required_int(
                                row[column_indices["participantNumber"]], field_name="participantNumber"
                            ),
                            "cohort_id": cohort_id,
                            "measurement": required_float(
                                row[column_indices["measurement"]], field_name="measurement"
                            ),
                            "diagnosis": required_string(row[column_indices["diagnosis"]], field_name="diagnosis"),
                        }
                    )
                except ValueError as error:
                    LOGGER.warning("Skipping biomarker CSV row %s: %s", row_number, error)
                    continue

                if len(batch) == BIOMARKER_BATCH_SIZE:
                    await self._insert_batch(batch)
                    batch.clear()

            if batch:
                await self._insert_batch(batch)

            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

    async def _insert_batch(self, batch: list[dict[str, int | float | str]]) -> None:
        """Insert one biomarker measurement batch."""
        statement = (
            pg_insert(BiomarkerMeasurement)
            .values(batch)
            .on_conflict_do_nothing(constraint="uq_participant_cohort_variable")
        )

        await self.session.execute(statement)
