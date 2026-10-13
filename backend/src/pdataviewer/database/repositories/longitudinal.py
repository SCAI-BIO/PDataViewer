import logging
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
from pdataviewer.database.models import Cohort, LongitudinalMeasurement
from pdataviewer.database.repositories.base import BaseRepository
from pdataviewer.database.repositories.cohorts import CohortRepository

LOGGER = logging.getLogger(__name__)
LONGITUDINAL_BATCH_SIZE = 5000
MAX_PATIENT_COUNT = 2**31 - 1
LONGITUDINAL_COLUMNS = ("months", "cohort", "patientCount", "totalPatientCount")
REQUIRED_LONGITUDINAL_COLUMNS: set[str] = set(LONGITUDINAL_COLUMNS)


class LongitudinalMeasurementRecord(TypedDict):
    id: int
    months: float
    variable: str
    patientCount: int
    totalPatientCount: int
    cohort: str


class LongitudinalInsert(TypedDict):
    """Validated values for one longitudinal database row."""

    variable: str
    months: float
    cohort_id: int
    patient_count: int
    total_patient_count: int


def _required_count(value: object, *, field_name: str) -> int:
    """Read a nonnegative count that fits the database's INTEGER column."""
    count = required_int(value, field_name=field_name)

    if not 0 <= count <= MAX_PATIENT_COUNT:
        raise ValueError(f"{field_name} must be between 0 and {MAX_PATIENT_COUNT}")

    return count


def _prepare_measurements(
    dataframe: pd.DataFrame,
    variable_name: str,
    cohort_map: dict[str, int],
) -> list[LongitudinalInsert]:
    """Validate and deduplicate the full snapshot before changing stored data."""
    records: dict[tuple[float, int], LongitudinalInsert] = {}
    rows = dataframe.loc[:, list(LONGITUDINAL_COLUMNS)].itertuples(index=False, name=None)

    for row_number, (raw_months, raw_cohort, raw_count, raw_total) in enumerate(rows, start=2):
        try:
            cohort_name = required_string(raw_cohort, field_name="cohort")
            cohort_id = cohort_map.get(cohort_name)

            if cohort_id is None:
                raise ValueError(f"Unknown cohort: {cohort_name!r}")

            months = required_float(raw_months, field_name="months")
            patient_count = _required_count(raw_count, field_name="patientCount")
            total_patient_count = _required_count(raw_total, field_name="totalPatientCount")

            if patient_count > total_patient_count:
                raise ValueError("patientCount cannot exceed totalPatientCount")

            record = LongitudinalInsert(
                variable=variable_name,
                months=months,
                cohort_id=cohort_id,
                patient_count=patient_count,
                total_patient_count=total_patient_count,
            )
            key = (months, cohort_id)
            existing = records.get(key)

            if existing is not None and existing != record:
                raise ValueError(f"Conflicting duplicate measurement for cohort {cohort_name!r} at month {months}")

            records[key] = record
        except ValueError as error:
            raise ValueError(f"Invalid {variable_name!r} longitudinal CSV row {row_number}: {error}") from error

    return sorted(records.values(), key=lambda record: (record["cohort_id"], record["months"]))


class LongitudinalRepository(BaseRepository):
    """Read and import longitudinal participant counts."""

    def __init__(self, session: AsyncSession, cohort_repository: CohortRepository) -> None:
        super().__init__(session)
        self.cohort_repository = cohort_repository

    async def get_all(
        self, variable: str | None = None, cohort_name: str | None = None
    ) -> list[LongitudinalMeasurementRecord]:
        """Return measurements ordered by variable, cohort, and visit month."""
        statement = (
            select(
                LongitudinalMeasurement.id,
                LongitudinalMeasurement.months,
                LongitudinalMeasurement.variable,
                LongitudinalMeasurement.patient_count,
                LongitudinalMeasurement.total_patient_count,
                Cohort.name,
            )
            .select_from(LongitudinalMeasurement)
            .join(Cohort, LongitudinalMeasurement.cohort_id == Cohort.id)
            .order_by(
                LongitudinalMeasurement.variable,
                Cohort.name,
                LongitudinalMeasurement.months,
                LongitudinalMeasurement.id,
            )
        )

        if variable is not None:
            statement = statement.where(LongitudinalMeasurement.variable == variable)

        if cohort_name is not None:
            statement = statement.where(Cohort.name == cohort_name)

        result = await self.session.execute(statement)

        return [
            LongitudinalMeasurementRecord(
                id=measurement_id,
                months=months,
                variable=measurement_variable,
                patientCount=patient_count,
                totalPatientCount=total_patient_count,
                cohort=cohort,
            )
            for measurement_id, months, measurement_variable, patient_count, total_patient_count, cohort in result
        ]

    async def get_variables(self) -> list[str]:
        """Return all distinct longitudinal variables in alphabetical order."""
        result = await self.session.scalars(
            select(LongitudinalMeasurement.variable).distinct().order_by(LongitudinalMeasurement.variable)
        )
        return list(result)

    async def import_measurements(self, csv_data: bytes, variable_name: str) -> None:
        """Replace a variable's complete longitudinal snapshot in one transaction.

        Previous visits and cohorts absent from the CSV are removed for this
        variable. Empty uploads, unknown cohorts, invalid counts, and conflicting
        duplicates are rejected before deletion. Identical duplicates collapse
        into one record. Finite negative months are allowed for pre-baseline visits.

        The full CSV is validated in memory; database inserts use bounded batches.
        Use a session dedicated to this import and serialize imports for the same
        variable. This method owns commit and rollback for the entire session.
        """
        variable_name = required_string(variable_name, field_name="variable_name")
        source_name = f"{variable_name} longitudinal measurement CSV"
        dataframe = read_csv_bytes(
            csv_data,
            source_name=source_name,
            dtype={column: "string" for column in REQUIRED_LONGITUDINAL_COLUMNS},
        )
        require_columns(dataframe, REQUIRED_LONGITUDINAL_COLUMNS, source_name=source_name)

        if dataframe.empty:
            raise ValueError(f"{source_name} contains no measurement rows")

        try:
            cohort_map = await self.cohort_repository.get_name_to_id_map()
            measurements = _prepare_measurements(dataframe, variable_name, cohort_map)

            await self.session.execute(
                delete(LongitudinalMeasurement).where(LongitudinalMeasurement.variable == variable_name)
            )

            for start in range(0, len(measurements), LONGITUDINAL_BATCH_SIZE):
                await self._insert_batch(measurements[start : start + LONGITUDINAL_BATCH_SIZE])

            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        LOGGER.info("Replaced longitudinal variable %r with %s measurements", variable_name, len(measurements))

    async def _insert_batch(self, batch: list[LongitudinalInsert]) -> None:
        """Insert validated rows, allowing unexpected conflicts to fail the import."""
        await self.session.execute(insert(LongitudinalMeasurement), batch)
