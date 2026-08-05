from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from api.config import DATABASE_URL
from database.postgresql import PostgreSQLRepository
from database.repositories import AnalyticsRepository, CohortRepository, LongitudinalRepository
from database.repositories.biomarkers import BiomarkerRepository
from database.repositories.concepts import ConceptRepository

engine: AsyncEngine = create_async_engine(
    DATABASE_URL, pool_size=10, max_overflow=20, pool_timeout=30, pool_pre_ping=True, pool_recycle=1800
)

AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Provide one database session for the current request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


def get_client(session: Annotated[AsyncSession, Depends(get_session)]) -> PostgreSQLRepository:
    """Provide the database repository facade."""
    return PostgreSQLRepository(session=session, engine=engine)


def get_analytics_repository(session: Annotated[AsyncSession, Depends(get_session)]) -> AnalyticsRepository:
    """Provide the analytics repository."""
    cohort_repository = CohortRepository(session)
    return AnalyticsRepository(session=session, cohort_repository=cohort_repository)


def get_longitudinal_repository(session: Annotated[AsyncSession, Depends(get_session)]) -> LongitudinalRepository:
    """Provide the longitudinal repository."""
    cohort_repository = CohortRepository(session)
    return LongitudinalRepository(session=session, cohort_repository=cohort_repository)


def get_cohort_repository(session: Annotated[AsyncSession, Depends(get_session)]) -> CohortRepository:
    """Provide the cohort repository."""
    return CohortRepository(session)


def get_concept_repository(session: Annotated[AsyncSession, Depends(get_session)]) -> ConceptRepository:
    """Provide the concept repository."""
    cohort_repository = CohortRepository(session)
    return ConceptRepository(session=session, cohort_repository=cohort_repository)


def get_biomarker_repository(session: Annotated[AsyncSession, Depends(get_session)]) -> BiomarkerRepository:
    """Provide the biomarker repository."""
    cohort_repository = CohortRepository(session)
    return BiomarkerRepository(session=session, cohort_repository=cohort_repository)


def get_database_engine() -> AsyncEngine:
    """Provide the application database engine."""
    return engine


async def dispose_engine() -> None:
    """Dispose of the database connection pool."""
    await engine.dispose()
