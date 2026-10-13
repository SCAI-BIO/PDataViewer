from typing import TypedDict

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from pdataviewer.database.import_utils import (
    optional_int,
    optional_string,
    read_csv_bytes,
    required_string,
)
from pdataviewer.database.models import Cohort
from pdataviewer.database.repositories.base import BaseRepository

COHORT_BATCH_SIZE = 1000
MAX_PARTICIPANT_COUNT = 2**31 - 1
MAX_REFERENCE_LENGTH = 255
METADATA_COLUMNS = {
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
REQUIRED_METADATA_COLUMS: set[str] = set(METADATA_COLUMNS)


class CohortImport(TypedDict):
    """Validated metadata for a cohort insert or update."""

    name: str
    participants: int | None
    control_participants: int | None
    prodpromal_participants: int | None
    pd_participants: int | None
    longitudinal_participants: int | None
    follow_up_interval: str | None
    location: str | None
    doi: str | None
    link: str | None
    color: str


def _optional_count(value: object, *, field_name: str) -> int | None:
    """Read a nonnegative count that fits the database's INTEGER column."""
    count = optional_int(optional_string(value), field_name=field_name)

    if count is not None and not 0 <= count <= MAX_PARTICIPANT_COUNT:
        raise ValueError(f"{field_name} must be between 0 and {MAX_PARTICIPANT_COUNT}")

    return count


def _optional_reference(value: object, *, field_name: str) -> str | None:
    """Read optional DOI or link text that fits its VARCHAR(255) column."""
    text = optional_string(value)

    if text is not None and len(text) > MAX_REFERENCE_LENGTH:
        raise ValueError(f"{field_name} must be at most {MAX_REFERENCE_LENGTH} characters")

    return text


def _prepare_metadata(csv_data: bytes) -> list[CohortImport]:
    """Parse and validate every CSV record before performing database writes."""
    source_name = "cohort metadata CSV"
    dataframe = read_csv_bytes(
        csv_data, source_name=source_name, dtype={column: "string" for column in REQUIRED_METADATA_COLUMS}
    )

    cohorts_data: list[CohortImport] = []
    seen_names: set[str] = set()
    rows = dataframe.loc[:, list(METADATA_COLUMNS)].itertuples(index=False, name=None)

    for row_number, row in enumerate(rows, start=2):
        (
            raw_name,
            participants,
            controls,
            prodromal,
            pd_patients,
            longitudinal,
            follow_up_interval,
            location,
            doi,
            link,
            color,
        ) = row

        try:
            name = required_string(raw_name, field_name="cohort")

            if name in seen_names:
                raise ValueError(f"Duplicate cohort name: {name!r}")

            cohort_data = CohortImport(
                name=name,
                participants=_optional_count(participants, field_name="participants"),
                control_participants=_optional_count(controls, field_name="healthyControls"),
                prodpromal_participants=_optional_count(prodromal, field_name="prodromalPatients"),
                pd_participants=_optional_count(pd_patients, field_name="pdPatients"),
                longitudinal_participants=_optional_count(longitudinal, field_name="longitudinalPatients"),
                follow_up_interval=optional_string(follow_up_interval),
                location=optional_string(location),
                doi=_optional_reference(doi, field_name="doi"),
                link=_optional_reference(link, field_name="link"),
                color=required_string(color, field_name="color"),
            )
        except ValueError as error:
            raise ValueError(f"Invalid cohort metadata at CSV row {row_number}: {error}") from error

        seen_names.add(name)
        cohorts_data.append(cohort_data)

    # Acquire conflicting cohort rows in a consistent order across imports.
    cohorts_data.sort(key=lambda cohort: cohort["name"])
    return cohorts_data


class CohortRepository(BaseRepository):
    """Read and import cohort metadata."""

    async def get_all(self) -> list[Cohort]:
        """Return all cohorts ordered by name."""
        result = await self.session.scalars(select(Cohort).order_by(Cohort.name))
        return list(result)

    async def get_names(self) -> list[str]:
        """Return all cohort names in alphabetical order."""
        result = await self.session.scalars(select(Cohort.name).order_by(Cohort.name))
        return list(result)

    async def get_name_to_id_map(self) -> dict[str, int]:
        """Return cohort database identifiers keyed by cohort name."""
        result = await self.session.execute(select(Cohort.name, Cohort.id))
        return {name: cohort_id for name, cohort_id in result}

    async def import_metadata(self, csv_data: bytes) -> None:
        """Insert new cohorts and update metadata for existing cohort names.

        Each row supplies complete metadata: missing optional values overwrite existing
        values with NULL. Omitted cohorts are retained, and existing cohort IDs and their
        related records aare preserved. Names are stripped and matched case-sensitively;
        this method does not rename cohorts.

        All rows are validated before writing. A header-only CSV is a no-op. Batches share
        one transaction, owned by this method. Use a session dedicated to this import because
        commit and rollback affect the whole session. CSV parsin retains pandas' default
        missing-value markers.
        """
        cohorts_data = _prepare_metadata(csv_data)

        if not cohorts_data:
            return

        try:
            for start in range(0, len(cohorts_data), COHORT_BATCH_SIZE):
                await self._upsert_batch(cohorts_data[start : start + COHORT_BATCH_SIZE])

            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

    async def _upsert_batch(self, batch: list[CohortImport]) -> None:
        """Upsert one batch without replacing cohort IDs or related cohorts."""
        statement = pg_insert(Cohort).values(batch)
        statement = statement.on_conflict_do_update(
            index_elements=[Cohort.name],
            set_={
                "participants": statement.excluded.participants,
                "control_participants": statement.excluded.control_participants,
                "prodromal_participants": statement.excluded.prodromal_participants,
                "pd_participants": statement.excluded.pd_participants,
                "longitudinal_participants": statement.excluded.longitudinal_participants,
                "follow_up_interval": statement.excluded.follow_up_interval,
                "location": statement.excluded.location,
                "doi": statement.excluded.doi,
                "link": statement.excluded.link,
                "color": statement.excluded.color,
            },
        )

        result = await self.session.scalars(statement.returning(Cohort), execution_options={"populate_existing": True})
        result.all()
