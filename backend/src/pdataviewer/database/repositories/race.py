from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from pdataviewer.database.import_utils import required_string
from pdataviewer.database.models import Race
from pdataviewer.database.repositories.base import BaseRepository


class RaceRepository(BaseRepository):
    """Read and import race categories."""

    async def get_all(self) -> list[Race]:
        """Return all race categories ordered alphabetically."""
        result = await self.session.execute(select(Race).order_by(Race.race))
        return list(result.scalars().all())

    async def get_name_to_id_map(self) -> dict[str, int]:
        """Return race identifiers keyed by category name."""
        result = await self.session.execute(select(Race.race, Race.id))
        return {name: race_id for name, race_id in result.all()}

    async def ensure_categories(self, categories: Iterable[str]) -> None:
        """Insert race categories that do not already exist."""
        names = sorted({required_string(name, field_name="race") for name in categories})

        if not names:
            return

        statement = (
            pg_insert(Race)
            .values([{"race": name} for name in names])
            .on_conflict_do_nothing(index_elements=[Race.race])
        )

        try:
            await self.session.execute(statement)
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise
