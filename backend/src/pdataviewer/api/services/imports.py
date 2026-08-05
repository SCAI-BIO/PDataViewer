import io
import logging
import zipfile
from dataclasses import dataclass

from pdataviewer.api.schemas import UploadType
from pdataviewer.api.upload_utils import (
    CSV_SUFFIX,
    SUPPORTED_UPLOAD_SUFFIXES,
    ZIP_SUFFIX,
    get_csv_members,
    get_file_suffix,
    get_variable_name,
)
from pdataviewer.database.repositories.biomarkers import BiomarkerRepository
from pdataviewer.database.repositories.cohorts import CohortRepository
from pdataviewer.database.repositories.concepts import ConceptRepository
from pdataviewer.database.repositories.longitudinal import LongitudinalRepository

logger = logging.getLogger(__name__)


class ImportValidationError(ValueError):
    """Raised when an uploaded import file is invalid."""


@dataclass(frozen=True, slots=True)
class PreparedImport:
    """Validated input for a background import."""

    filename: str
    contents: bytes
    upload_type: UploadType


def prepare_import(filename: str, contents: bytes, upload_type: UploadType) -> PreparedImport:
    """Validate and prepare an uploaded database import."""
    normalized_filename = filename.strip()

    if not normalized_filename:
        raise ImportValidationError("No filename was provided.")

    if not contents:
        raise ImportValidationError("The uploaded file is empty.")

    suffix = get_file_suffix(normalized_filename)

    if suffix not in SUPPORTED_UPLOAD_SUFFIXES:
        raise ImportValidationError("Invalid file type. Only .zip and .csv files " "are accepted.")

    if suffix == ZIP_SUFFIX and not zipfile.is_zipfile(io.BytesIO(contents)):
        raise ImportValidationError("The uploaded file is not a valid ZIP archive.")

    return PreparedImport(filename=normalized_filename, contents=contents, upload_type=upload_type)


class ImportService:
    """Coordinate database imports across domain repositories."""

    def __init__(
        self,
        cohort_repository: CohortRepository,
        concept_repository: ConceptRepository,
        longitudinal_repository: LongitudinalRepository,
        biomarker_repository: BiomarkerRepository,
    ) -> None:
        self.cohort_repository = cohort_repository
        self.concept_repository = concept_repository
        self.longitudinal_repository = longitudinal_repository
        self.biomarker_repository = biomarker_repository

    async def process(self, prepared_import: PreparedImport) -> None:
        """Process a prepared CSV file or ZIP archive."""
        suffix = get_file_suffix(prepared_import.filename)

        if suffix == CSV_SUFFIX:
            logger.info("Processing CSV file: %s", prepared_import.filename)

            await self._run_import(
                upload_type=prepared_import.upload_type,
                data=prepared_import.contents,
                variable_name=get_variable_name(prepared_import.filename),
            )
            return

        if suffix == ZIP_SUFFIX:
            await self._process_zip_archive(prepared_import)
            return

        raise ImportValidationError(f"Unsupported file type for " f"{prepared_import.filename!r}")

    async def _process_zip_archive(self, prepared_import: PreparedImport) -> None:
        """Process all CSV files contained in a ZIP archive."""
        archive_buffer = io.BytesIO(prepared_import.contents)

        try:
            with zipfile.ZipFile(archive_buffer) as archive:
                csv_members = sorted(get_csv_members(archive), key=lambda member: (member.filename.casefold()))

                if not csv_members:
                    raise ImportValidationError(
                        f"ZIP archive " f"{prepared_import.filename!r} " "contains no CSV files."
                    )

                logger.info("Found %d CSV files in archive %s", len(csv_members), prepared_import.filename)

                for index, member in enumerate(csv_members, start=1):
                    logger.info("[%d/%d] Importing %s", index, len(csv_members), member.filename)

                    await self._run_import(
                        upload_type=prepared_import.upload_type,
                        data=archive.read(member),
                        variable_name=get_variable_name(member.filename),
                    )

        except zipfile.BadZipFile as error:
            raise ImportValidationError(
                f"Uploaded file " f"{prepared_import.filename!r} " "is not a valid ZIP archive."
            ) from error

    async def _run_import(self, upload_type: UploadType, data: bytes, variable_name: str) -> None:
        """Delegate one CSV import to its domain repository."""
        match upload_type:
            case UploadType.METADATA:
                await self.cohort_repository.import_metadata(data)

            case UploadType.CDM:
                await self.concept_repository.import_cdm(data, modality=variable_name)

            case UploadType.LONGITUDINAL:
                await self.longitudinal_repository.import_measurements(data, variable_name)

            case UploadType.BIOMARKERS:
                await self.biomarker_repository.import_measurements(data, variable_name)

            case _:
                raise ValueError(f"Unsupported upload type: {upload_type!r}")
