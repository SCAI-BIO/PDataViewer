import io
import logging
import zipfile

from api.dependencies import AsyncSessionLocal
from api.schemas import UploadType
from api.upload_utils import CSV_SUFFIX, ZIP_SUFFIX, get_csv_members, get_file_suffix, get_variable_name
from database.postgresql import PostgreSQLRepository

logger = logging.getLogger(__name__)


async def process_import_background(file_contents: bytes, filename: str, upload_type: UploadType) -> None:
    """Process an uploaded CSV file or ZIP archive in the background."""
    logger.info("Starting background import for %r with type %s", filename, upload_type.value)

    try:
        async with AsyncSessionLocal() as session:
            repository = PostgreSQLRepository(session=session)

            try:
                await _process_import_file(repository, file_contents, filename, upload_type)
            except Exception:
                await session.rollback()
                raise

    except Exception:
        logger.exception("Background import failed for %r", filename)
    else:
        logger.info("Background import completed successfully for %r", filename)


async def _process_import_file(
    repository: PostgreSQLRepository, file_contents: bytes, filename: str, upload_type: UploadType
) -> None:
    """Route an uploaded file according to its file type."""
    suffix = get_file_suffix(filename)

    if suffix == ZIP_SUFFIX:
        await _process_zip_archive(repository, file_contents, filename, upload_type)
        return

    if suffix == CSV_SUFFIX:
        logger.info("Processing single CSV file: %s", filename)

        await _run_import(repository, upload_type, file_contents, get_variable_name(filename))
        return

    raise ValueError(f"Unsupported file type for {filename!r}; " "expected a .csv or .zip file")


async def _process_zip_archive(
    repository: PostgreSQLRepository, file_contents: bytes, filename: str, upload_type: UploadType
) -> None:
    """Process all CSV members in a ZIP archive."""
    archive_buffer = io.BytesIO(file_contents)

    if not zipfile.is_zipfile(archive_buffer):
        raise ValueError(f"Uploaded file {filename!r} is not a valid ZIP archive")

    archive_buffer.seek(0)
    logger.info("Processing ZIP archive: %s", filename)

    with zipfile.ZipFile(archive_buffer) as archive:
        csv_members = get_csv_members(archive)

        if not csv_members:
            raise ValueError(f"ZIP archive {filename!r} contains no CSV files")

        logger.info("Found %d CSV files in archive %s", len(csv_members), filename)

        for index, member in enumerate(csv_members, start=1):
            logger.info("[%d/%d] Importing archive member: %s", index, len(csv_members), member.filename)
            csv_data = archive.read(member)
            await _run_import(repository, upload_type, csv_data, get_variable_name(member.filename))


async def _run_import(
    repository: PostgreSQLRepository, upload_type: UploadType, data: bytes, variable_name: str
) -> None:
    """Run the repository import matching the selected upload type."""
    match upload_type:
        case UploadType.LONGITUDINAL:
            await repository.import_longitudinal_measurements(data, variable_name)

        case UploadType.BIOMARKERS:
            await repository.import_biomarker_measurements(data, variable_name)

        case UploadType.METADATA:
            await repository.import_metadata(data)

        case UploadType.CDM:
            await repository.import_cdm(data, modality=variable_name)
