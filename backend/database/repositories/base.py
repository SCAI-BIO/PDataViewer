from sqlalchemy.ext.asyncio import AsyncSession


class BaseRepository:
    """Base class for repositories that share an asynchronous session."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
