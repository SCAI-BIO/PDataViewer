import logging

from sqlalchemy.ext.asyncio import AsyncSession

from pdataviewer.api.dependencies import AsyncSessionLocal
from pdataviewer.api.services.imports import ImportService, PreparedImport
from pdataviewer.database.repositories.biomarkers import BiomarkerRepository
from pdataviewer.database.repositories.cohorts import CohortRepository
from pdataviewer.database.repositories.concepts import ConceptRepository
from pdataviewer.database.repositories.longitudinal import LongitudinalRepository

logger = logging.getLogger(__name__)


def _create_import_service(session: AsyncSession) -> ImportService:
    """Create an import service using one shared session."""
    cohort_repository = CohortRepository(session)

    return ImportService(
        cohort_repository=cohort_repository,
        concept_repository=ConceptRepository(session=session, cohort_repository=cohort_repository),
        longitudinal_repository=LongitudinalRepository(session=session, cohort_repository=cohort_repository),
        biomarker_repository=BiomarkerRepository(session=session, cohort_repository=cohort_repository),
    )


async def process_import_background(prepared_import: PreparedImport) -> None:
    """Process a prepared database import in the background."""
    logger.info(
        "Starting background import for %r with type %s", prepared_import.filename, prepared_import.upload_type.value
    )

    try:
        async with AsyncSessionLocal() as session:
            import_service = _create_import_service(session)

            try:
                await import_service.process(prepared_import)
            except Exception:
                await session.rollback()
                raise

    except Exception:
        logger.exception("Background import failed for %r", prepared_import.filename)
    else:
        logger.info("Background import completed successfully for %r", prepared_import.filename)
