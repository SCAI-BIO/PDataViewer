import logging
from collections import defaultdict
from typing import TypedDict

import pandas as pd
from sqlalchemy import delete, insert, select
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
BIOMARKER_COLUMNS = ("participantNumber", "cohort", "measurement", "diagnosis")
REQUIRED_BIOMARKER_COLUMNS: set[str] = set(BIOMARKER_COLUMNS)
MAX_PARTICIPANT_NUMBER = 2**31 - 1


class BiomarkerInsert(TypedDict):
    """Validated values for one biomarker database row."""

    variable: str
    participant_id: int
    cohort_id: int
    measurement: float
    diagnosis: str


def _prepare_measurements(
    dataframe: pd.DataFrame,
    variable_name: str,
    cohort_map: dict[str, int],
) -> list[BiomarkerInsert]:
    """Validate the complete snapshot before changing existing measurements."""
    measurements: list[BiomarkerInsert] = []
    seen_participants: set[tuple[int, int]] = set()
    rows = dataframe.loc[:, list(BIOMARKER_COLUMNS)].itertuples(index=False, name=None)

    for row_number, (participant_number, raw_cohort, raw_measurement, raw_diagnosis) in enumerate(rows, start=2):
        try:
            cohort_name = required_string(raw_cohort, field_name="cohort")
            cohort_id = cohort_map.get(cohort_name)

            if cohort_id is None:
                raise ValueError(f"Unknown cohort: {cohort_name!r}")

            participant_id = required_int(participant_number, field_name="participantNumber")

            if not 0 <= participant_id <= MAX_PARTICIPANT_NUMBER:
                raise ValueError(f"participantNumber must be between 0 and {MAX_PARTICIPANT_NUMBER}")

            participant_key = (cohort_id, participant_id)

            if participant_key in seen_participants:
                raise ValueError(f"Duplicate participantNumber {participant_id} for cohort {cohort_name!r}")

            measurement = required_float(raw_measurement, field_name="measurement")
            diagnosis = required_string(raw_diagnosis, field_name="diagnosis")
        except ValueError as error:
            raise ValueError(f"Invalid {variable_name!r} biomarker CSV row {row_number}: {error}") from error

        seen_participants.add(participant_key)
        measurements.append(
            BiomarkerInsert(
                variable=variable_name,
                participant_id=participant_id,
                cohort_id=cohort_id,
                measurement=measurement,
                diagnosis=diagnosis,
            )
        )

    return measurements


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
        return list(result.scalars())

    async def get_cohorts_for_variable(self, variable: str) -> list[str]:
        """Return cohorts that contain a biomarker variable."""
        result = await self.session.execute(
            select(Cohort.name)
            .join(BiomarkerMeasurement, Cohort.id == BiomarkerMeasurement.cohort_id)
            .where(BiomarkerMeasurement.variable == variable)
            .distinct()
            .order_by(Cohort.name)
        )
        return list(result.scalars())

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

        for cohort_name, diagnosis in result:
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
        return list(result.scalars())

    async def import_measurements(self, csv_data: bytes, variable_name: str) -> None:
        """Replace all measurements for a variable using one complete CSV snapshot.

        Cohorts omitted from the upload lose their previous measurements for
        this variable. Empty uploads, invalid rows, unknown cohorts, and duplicate
        participant/cohort keys are rejected before deletion.

        This method owns commit and rollback; use a session dedicated to the
        import and serialize imports for the same variable. The full upload is
        validated in memory, while database inserts use bounded batches.
        """
        variable_name = required_string(variable_name, field_name="variable_name")
        source_name = f"{variable_name} biomarker CSV"

        dataframe = read_csv_bytes(
            csv_data,
            source_name=source_name,
            dtype={column: "string" for column in REQUIRED_BIOMARKER_COLUMNS},
        )
        require_columns(dataframe, REQUIRED_BIOMARKER_COLUMNS, source_name=source_name)

        if dataframe.empty:
            raise ValueError(f"{source_name} contains no measurement rows")

        try:
            cohort_map = await self.cohort_repository.get_name_to_id_map()
            measurements = _prepare_measurements(dataframe, variable_name, cohort_map)

            await self.session.execute(
                delete(BiomarkerMeasurement).where(BiomarkerMeasurement.variable == variable_name)
            )

            for start in range(0, len(measurements), BIOMARKER_BATCH_SIZE):
                await self._insert_batch(measurements[start : start + BIOMARKER_BATCH_SIZE])

            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        LOGGER.info("Replaced biomarker variable %r with %s measurements", variable_name, len(measurements))

    async def _insert_batch(self, batch: list[BiomarkerInsert]) -> None:
        """Insert validated rows, allowing unexpected conflicts to fail the import."""
        await self.session.execute(insert(BiomarkerMeasurement), batch)
