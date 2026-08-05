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
from pdataviewer.database.models import Cohort, LongitudinalMeasurement
from pdataviewer.database.repositories.base import BaseRepository
from pdataviewer.database.repositories.cohorts import CohortRepository
from pdataviewer.database.typeddicts import LongitudinalMeasurementRecord

REQUIRED_LONGITUDINAL_COLUMNS = {"months", "cohort", "patientCount", "totalPatientCount"}


class LongitudinalRepository(BaseRepository):
    """Read and import longitudinal measurements."""

    def __init__(self, session: AsyncSession, cohort_repository: CohortRepository) -> None:
        super().__init__(session)
        self.cohort_repository = cohort_repository

    async def get_all(
        self, variable: str | None = None, cohort_name: str | None = None
    ) -> list[LongitudinalMeasurementRecord]:
        """Return longitudinal measurements with cohort names."""
        statement = select(
            LongitudinalMeasurement.id.label("id"),
            LongitudinalMeasurement.months.label("months"),
            LongitudinalMeasurement.variable.label("variable"),
            LongitudinalMeasurement.patient_count.label("patient_count"),
            LongitudinalMeasurement.total_patient_count.label("total_patient_count"),
            Cohort.name.label("cohort"),
        ).join(Cohort, LongitudinalMeasurement.cohort_id == Cohort.id)

        if variable is not None:
            statement = statement.where(LongitudinalMeasurement.variable == variable)

        if cohort_name is not None:
            statement = statement.where(Cohort.name == cohort_name)

        result = await self.session.execute(statement)

        return [
            LongitudinalMeasurementRecord(
                id=row["id"],
                months=row["months"],
                variable=row["variable"],
                patientCount=row["patient_count"],
                totalPatientCount=row["total_patient_count"],
                cohort=row["cohort"],
            )
            for row in result.mappings().all()
        ]

    async def get_variables(self) -> list[str]:
        """Return all distinct longitudinal variables."""
        result = await self.session.execute(
            select(LongitudinalMeasurement.variable).distinct().order_by(LongitudinalMeasurement.variable)
        )
        return list(result.scalars().all())

    async def import_measurements(self, csv_data: bytes, variable_name: str) -> None:
        """Import longitudinal measurements from CSV bytes."""
        variable_name = required_string(variable_name, field_name="variable_name")
        dataframe = read_csv_bytes(csv_data, source_name=(f"{variable_name} longitudinal measurement CSV"))
        require_columns(
            dataframe, REQUIRED_LONGITUDINAL_COLUMNS, source_name=(f"{variable_name} longitudinal measurement CSV")
        )

        column_indices = {column: index for index, column in enumerate(dataframe.columns)}

        try:
            cohort_map = await self.cohort_repository.get_name_to_id_map()
            records: dict[tuple[str, float, int], dict[str, int | float | str]] = {}

            for row_number, row in enumerate(dataframe.itertuples(index=False, name=None), start=2):
                try:
                    cohort_name = required_string(row[column_indices["cohort"]], field_name="cohort")
                    cohort_id = cohort_map.get(cohort_name)

                    if cohort_id is None:
                        continue

                    months = required_float(row[column_indices["months"]], field_name="months")
                    patient_count = required_int(row[column_indices["patientCount"]], field_name="patientCount")
                    total_patient_count = required_int(
                        row[column_indices["totalPatientCount"]], field_name="totalPatientCount"
                    )

                    record = {
                        "variable": variable_name,
                        "months": months,
                        "cohort_id": cohort_id,
                        "patient_count": patient_count,
                        "total_patient_count": total_patient_count,
                    }

                    key = (variable_name, months, cohort_id)
                    existing = records.get(key)

                    if existing is not None and existing != record:
                        raise ValueError("conflicting duplicate measurement")

                    records[key] = record
                except ValueError as exc:
                    raise ValueError("Invalid longitudinal measurement at " f"CSV row {row_number}: {exc}") from exc

            if not records:
                return

            statement = (
                pg_insert(LongitudinalMeasurement)
                .values(list(records.values()))
                .on_conflict_do_nothing(constraint="uq_variable_months_cohort")
            )
            await self.session.execute(statement)
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise
