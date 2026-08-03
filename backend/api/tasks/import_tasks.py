import io
import logging
import zipfile

from database.postgresql import PostgreSQLRepository

from api.dependencies import AsyncSessionLocal
from api.model import UploadType

logger = logging.getLogger("background_tasks")
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)


async def process_import_background(file_contents: bytes, filename: str, upload_type: UploadType):
    """
    Background task to process file imports with detailed logging.
    """
    logger.info(f"START: Background import for '{filename}' (Type: {upload_type.value})")

    try:
        async with AsyncSessionLocal() as session, PostgreSQLRepository(session) as repo:
            logger.debug("Database connection established for background task.")

            if filename.endswith(".zip") and file_contents.startswith(b"PK"):
                logger.info("Processing ZIP archive: %s", filename)

                with zipfile.ZipFile(io.BytesIO(file_contents)) as z:
                    csv_files = [name for name in z.namelist() if name.endswith(".csv")]
                    logger.info("Found %d CSV files in archive.", len(csv_files))

                    for i, member_name in enumerate(csv_files, 1):
                        logger.info("[%d/%d] Importing file: %s", i, len(csv_files), member_name)

                        with z.open(member_name) as csv_file:
                            csv_data = csv_file.read()

                        variable_name = member_name[:-4]
                        await _run_import(repo, upload_type, csv_data, variable_name)

            elif filename.endswith(".csv"):
                logger.info("Processing single CSV file: %s", filename)
                variable_name = filename[:-4]
                await _run_import(repo, upload_type, file_contents, variable_name)

            logger.info("SUCCESS: Finished background import for '%s'", filename)

    except Exception:
        logger.exception(f"FAILURE: Error during import of '{filename}'")


async def _run_import(repo: PostgreSQLRepository, upload_type: UploadType, data: bytes, variable_name: str):
    """Helper to route the import."""
    try:
        if upload_type == UploadType.LONGITUDINAL:
            await repo.import_longitudinal_measurements(data, variable_name)

        elif upload_type == UploadType.BIOMARKERS:
            await repo.import_biomarker_measurements(data, variable_name)

        elif upload_type == UploadType.METADATA:
            await repo.import_metadata(data)

        elif upload_type == UploadType.CDM:
            await repo.import_cdm(data, modality=variable_name)

    except Exception as e:
        logger.error(f"Error processing sub-file '{variable_name}': {e!s}")
        raise
