from collections.abc import Sequence
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import selectinload

from pdataviewer.database.import_utils import (
    read_csv_bytes,
    require_columns,
    required_int,
    required_string,
)
from pdataviewer.database.models import Cohort, CohortRace, Race
from pdataviewer.database.repositories.base import BaseRepository

COUNT_COLUMNS = (
    "selected_count",
    "valid_count",
    "unknown_count",
    "missing_count",
)

REQUIRED_RACE_COLUMNS = {"cohort", "race", *COUNT_COLUMNS}


@dataclass(frozen=True, slots=True)
class RaceDistributionRow:
    name: str
    value: int
    valid_count: int
    unknown_count: int
    missing_count: int


def _parse_counts_csv(csv_data: bytes) -> list[tuple[int, str, str, dict[str, int]]]:
    """Parse and validate cohort race CSV records."""
    dataframe = read_csv_bytes(csv_data, source_name="cohort race CSV")
    require_columns(dataframe, REQUIRED_RACE_COLUMNS, source_name="cohort race CSV")

    column_indices = {column: index for index, column in enumerate(dataframe.columns)}
    records: list[tuple[int, str, str, dict[str, int]]] = []
    seen: set[tuple[str, str]] = set()

    for row_number, row in enumerate(dataframe.itertuples(index=False, name=None), start=2):
        try:
            cohort_name = required_string(row[column_indices["cohort"]], field_name="cohort")
            race_name = required_string(row[column_indices["race"]], field_name="race")

            counts = {field: required_int(row[column_indices[field]], field_name=field) for field in COUNT_COLUMNS}

            if any(value < 0 for value in counts.values()):
                raise ValueError("Counts must be nonnegative")

            if counts["selected_count"] > counts["valid_count"]:
                raise ValueError("selected_count cannot exceed valid_count")

            key = (cohort_name, race_name)
            if key in seen:
                raise ValueError(f"Duplicate cohort/race: {cohort_name}/{race_name}")

            seen.add(key)
            records.append((row_number, cohort_name, race_name, counts))

        except ValueError as exc:
            raise ValueError(f"Invalid cohort race CSV at row {row_number}: {exc}") from exc

    return records


class CohortRaceRepository(BaseRepository):
    """Read and import aggregated cohort race responses."""

    async def get_cohort_names(self) -> list[str]:
        """Return names of cohorts with imported race data."""
        statement = (
            select(Cohort.name).join(CohortRace, CohortRace.cohort_id == Cohort.id).distinct().order_by(Cohort.name)
        )

        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def get_by_cohort(self, cohort_name: str) -> list[CohortRace]:
        """Return race counts for a cohort identified by name."""
        statement = (
            select(CohortRace)
            .join(Cohort, Cohort.id == CohortRace.cohort_id)
            .options(selectinload(CohortRace.race))
            .where(Cohort.name == cohort_name)
            .order_by(CohortRace.race_id)
        )

        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def get_distribution(
        self,
        cohort_names: Sequence[str] | None = None,
    ) -> list[RaceDistributionRow]:
        """Aggregate race selections across selected cohorts."""
        selected = func.sum(CohortRace.selected_count)

        statement = select(
            Race.race.label("name"),
            selected.label("value"),
            func.sum(CohortRace.valid_count).label("valid_count"),
            func.sum(CohortRace.unknown_count).label("unknown_count"),
            func.sum(CohortRace.missing_count).label("missing_count"),
        ).join(CohortRace, CohortRace.race_id == Race.id)

        if cohort_names is not None:
            statement = statement.join(Cohort, Cohort.id == CohortRace.cohort_id).where(Cohort.name.in_(cohort_names))

        statement = statement.group_by(Race.id, Race.race).order_by(selected.desc(), Race.race)

        result = await self.session.execute(statement)

        return [
            RaceDistributionRow(
                name=row["name"],
                value=row["value"],
                valid_count=row["valid_count"],
                unknown_count=row["unknown_count"],
                missing_count=row["missing_count"],
            )
            for row in result.mappings().all()
        ]

    async def import_counts(self, csv_data: bytes) -> None:
        """Import aggregated cohort race counts from CSV bytes."""
        parsed_rows = _parse_counts_csv(csv_data)

        if not parsed_rows:
            return

        try:
            cohort_result = await self.session.execute(select(Cohort.name, Cohort.id))
            cohort_ids = dict(cohort_result.all())
            race_names = sorted({race_name for _, _, race_name, _ in parsed_rows})

            statement = (
                pg_insert(Race)
                .values([{"race": name} for name in race_names])
                .on_conflict_do_nothing(index_elements=[Race.race])
            )

            await self.session.execute(statement)

            race_result = await self.session.execute(select(Race.race, Race.id).where(Race.race.in_(race_names)))
            race_ids = dict(race_result.all())

            records: list[dict[str, int]] = []

            for row_number, cohort_name, race_name, counts in parsed_rows:
                cohort_id = cohort_ids.get(cohort_name)

                if cohort_id is None:
                    raise ValueError(f"Invalid cohort race CSV at row {row_number}: Unknown cohort: {cohort_name}")

                records.append({"cohort_id": cohort_id, "race_id": race_ids[race_name], **counts})

            statement = pg_insert(CohortRace).values(records)
            statement = statement.on_conflict_do_update(
                index_elements=[CohortRace.cohort_id, CohortRace.race_id],
                set_={field: getattr(statement.excluded, field) for field in COUNT_COLUMNS},
            )

            await self.session.execute(statement)
            await self.session.commit()

        except Exception:
            await self.session.rollback()
            raise
