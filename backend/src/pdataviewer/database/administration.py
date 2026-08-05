from sqlalchemy.ext.asyncio import AsyncEngine

from pdataviewer.database.models import Base


async def recreate_database_schema(engine: AsyncEngine) -> None:
    """Drop all managed tables and recreate the database schema."""
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
