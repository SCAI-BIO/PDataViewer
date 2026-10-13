import logging
from asyncio import CancelledError
from time import perf_counter

from sqlalchemy.ext.asyncio import AsyncSession

from pdataviewer.api.dependencies import AsyncSessionLocal
from pdataviewer.api.services.imports import ImportService, PreparedImport
from pdataviewer.database.repositories.biomarkers import BiomarkerRepository
from pdataviewer.database.repositories.cohorts import CohortRepository
from pdataviewer.database.repositories.concepts import ConceptRepository
from pdataviewer.database.repositories.longitudinal import LongitudinalRepository

LOGGER = logging.getLogger(__name__)


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
    """Process an import in a dedicated session and log its outcome.

    Repositories manage their own transactions, so a ZIP import may commit earlier CSV
    files before a later file fails. Ordinary failures are logged; cancellation is logged
    and propagated to the task owner.
    """
    started_at = perf_counter()
    filename = prepared_import.filename
    upload_type = prepared_import.upload_type.value
    LOGGER.info("Starting background import for %r with type %s", filename, upload_type)

    try:
        async with AsyncSessionLocal() as session:
            import_service = _create_import_service(session)
            await import_service.process(prepared_import)
    except CancelledError:
        LOGGER.warning(
            "Background import cancelled for %r with type %s after %.2f seconds",
            filename,
            upload_type,
            perf_counter() - started_at,
        )
        raise
    except Exception:
        LOGGER.exception(
            "Background import failed for %r with type %s after %.2f seconds",
            filename,
            upload_type,
            perf_counter() - started_at,
        )
    else:
        LOGGER.info(
            "Background import completed successfully for %r with type %s in %.2f seconds",
            filename,
            upload_type,
            perf_counter() - started_at,
        )
