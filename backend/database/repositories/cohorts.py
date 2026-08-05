from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from database.import_utils import (
    optional_int,
    optional_string,
    read_csv_bytes,
    require_columns,
    required_string,
)
from database.models import Cohort
from database.repositories.base import BaseRepository

REQUIRED_METADATA_COLUMNS = {
    "cohort",
    "participants",
    "healthyControls",
    "prodromalPatients",
    "pdPatients",
    "longitudinalPatients",
    "followUpInterval",
    "location",
    "doi",
    "link",
    "color",
}


class CohortRepository(BaseRepository):
    """Read and import cohort metadata."""

    async def get_all(self) -> list[Cohort]:
        """Return all cohorts ordered by name."""
        result = await self.session.execute(select(Cohort).order_by(Cohort.name))
        return list(result.scalars().all())

    async def get_by_name(self, name: str) -> Cohort:
        """Return a cohort by name."""
        result = await self.session.execute(select(Cohort).where(Cohort.name == name))
        cohort = result.scalar_one_or_none()

        if cohort is None:
            raise ValueError(f"Cohort {name!r} not found")

        return cohort

    async def get_name_to_id_map(self) -> dict[str, int]:
        """Return cohort database identifiers keyed by cohort name."""
        result = await self.session.execute(select(Cohort.name, Cohort.id))
        return {name: cohort_id for name, cohort_id in result.all()}

    async def import_metadata(self, csv_data: bytes) -> None:
        """Import cohort metadata from CSV bytes."""
        dataframe = read_csv_bytes(csv_data, source_name="cohort metadata CSV")
        require_columns(dataframe, REQUIRED_METADATA_COLUMNS, source_name="cohort metadata CSV")
        column_indices = {column: index for index, column in enumerate(dataframe.columns)}
        cohorts_data: list[dict[str, Any]] = []

        for row_number, row in enumerate(dataframe.itertuples(index=False, name=None), start=2):
            try:
                cohorts_data.append(
                    {
                        "name": required_string(row[column_indices["cohort"]], field_name="cohort"),
                        "participants": optional_int(row[column_indices["participants"]], field_name="participants"),
                        "control_participants": optional_int(
                            row[column_indices["healthyControls"]], field_name="healthyControls"
                        ),
                        "prodromal_participants": optional_int(
                            row[column_indices["prodromalPatients"]], field_name="prodromalPatients"
                        ),
                        "pd_participants": optional_int(row[column_indices["pdPatients"]], field_name="pdPatients"),
                        "longitudinal_participants": optional_int(
                            row[column_indices["longitudinalPatients"]], field_name="longitudinalPatients"
                        ),
                        "follow_up_interval": optional_string(row[column_indices["followUpInterval"]]),
                        "location": optional_string(row[column_indices["location"]]),
                        "doi": optional_string(row[column_indices["doi"]]),
                        "link": optional_string(row[column_indices["link"]]),
                        "color": required_string(row[column_indices["color"]], field_name="color"),
                    }
                )
            except ValueError as exc:
                raise ValueError(f"Invalid cohort metadata at CSV row {row_number}: {exc}") from exc

        if not cohorts_data:
            return

        statement = pg_insert(Cohort).values(cohorts_data).on_conflict_do_nothing(index_elements=[Cohort.name])

        try:
            await self.session.execute(statement)
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise
