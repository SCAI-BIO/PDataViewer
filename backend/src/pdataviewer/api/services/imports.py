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

LOGGER = logging.getLogger(__name__)
REPLACEMENT_UPLOAD_TYPES = frozenset({UploadType.BIOMARKERS, UploadType.LONGITUDINAL})
ZIP_ENCRYPTED_FLAG = 0x1


class ImportValidationError(ValueError):
    """Raised when an uploaded import file is invalid."""


@dataclass(frozen=True, slots=True)
class PreparedImport:
    """An upload whose filename and container metadata have been validated.

    CSV contents and ZIP member integrity are checked during processing.
    """

    filename: str
    contents: bytes
    upload_type: UploadType


def _validated_variable_name(filename: str) -> str:
    """Extract a variable name and expose filename errors as import errors."""
    try:
        return get_variable_name(filename)
    except ValueError as error:
        raise ImportValidationError(str(error)) from error


def _open_zip_archive(contents: bytes, filename: str) -> zipfile.ZipFile:
    """Open an archive and validate that its directory can be read."""
    try:
        return zipfile.ZipFile(io.BytesIO(contents))
    except (zipfile.BadZipFile, OSError, EOFError, ValueError) as error:
        raise ImportValidationError(f"Could not open ZIP archive {filename!r}: {error}") from error


def _collect_csv_imports(
    archive: zipfile.ZipFile,
    *,
    filename: str,
    upload_type: UploadType,
) -> list[tuple[zipfile.ZipInfo, str]]:
    """Validate all CSV member metadata before any repository writes."""
    members = sorted(get_csv_members(archive), key=lambda member: (member.filename.casefold(), member.filename))

    if not members:
        raise ImportValidationError(f"ZIP archive {filename!r} contains no CSV files.")

    imports: list[tuple[zipfile.ZipInfo, str]] = []
    seen_variables: dict[str, str] = {}

    for member in members:
        variable_name = _validated_variable_name(member.filename)

        if member.flag_bits & ZIP_ENCRYPTED_FLAG:
            raise ImportValidationError(f"CSV member {member.filename!r} in {filename!r} is encrypted.")

        if member.file_size == 0:
            raise ImportValidationError(f"CSV member {member.filename!r} in {filename!r} is empty.")

        if upload_type in REPLACEMENT_UPLOAD_TYPES:
            # Match the repository's exact variable key; directories are not part of it.
            existing_filename = seen_variables.get(variable_name)

            if existing_filename is not None:
                raise ImportValidationError(
                    f"CSV members {existing_filename!r} and {member.filename!r} in {filename!r} "
                    f"both target variable {variable_name!r}. Supply one complete CSV per variable."
                )

            seen_variables[variable_name] = member.filename

        imports.append((member, variable_name))

    return imports


def _read_csv_member(archive: zipfile.ZipFile, member: zipfile.ZipInfo, filename: str) -> bytes:
    """Read one CSV and give archive or decompression errors member context."""
    try:
        return archive.read(member)
    except Exception as error:
        # This boundary covers only ZIP reading, never repository operations.
        raise ImportValidationError(
            f"Could not read CSV member {member.filename!r} in {filename!r}: {error}"
        ) from error


def prepare_import(filename: str, contents: bytes, upload_type: UploadType) -> PreparedImport:
    """Validate an upload's metadata without decompressing its CSV members."""
    normalized_filename = filename.strip()

    if not normalized_filename:
        raise ImportValidationError("No filename was provided.")

    if not contents:
        raise ImportValidationError("The uploaded file is empty.")

    try:
        validated_upload_type = UploadType(upload_type)
    except ValueError as error:
        raise ImportValidationError(f"Unsupported upload type: {upload_type!r}") from error

    suffix = get_file_suffix(normalized_filename)

    if suffix not in SUPPORTED_UPLOAD_SUFFIXES:
        raise ImportValidationError("Invalid file type. Only .zip and .csv files are accepted.")

    if suffix == CSV_SUFFIX:
        _validated_variable_name(normalized_filename)
    else:
        with _open_zip_archive(contents, normalized_filename) as archive:
            _collect_csv_imports(archive, filename=normalized_filename, upload_type=validated_upload_type)

    return PreparedImport(filename=normalized_filename, contents=contents, upload_type=validated_upload_type)


class ImportService:
    """Coordinate database imports across domain repositories.

    Repositories commit each CSV independently. A later failure or cancellation
    does not undo earlier CSV imports. Callers must serialize concurrent imports
    that replace the same variable.
    """

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
            LOGGER.info("Processing CSV file %r", prepared_import.filename)
            await self._run_import(
                upload_type=prepared_import.upload_type,
                data=prepared_import.contents,
                variable_name=_validated_variable_name(prepared_import.filename),
                source_name=prepared_import.filename,
            )
            return

        if suffix == ZIP_SUFFIX:
            await self._process_zip_archive(prepared_import)
            return

        raise ImportValidationError(f"Unsupported file type for {prepared_import.filename!r}")

    async def _process_zip_archive(self, prepared_import: PreparedImport) -> None:
        """Validate the complete member list, then import CSV files in order."""
        with _open_zip_archive(prepared_import.contents, prepared_import.filename) as archive:
            csv_imports = _collect_csv_imports(
                archive,
                filename=prepared_import.filename,
                upload_type=prepared_import.upload_type,
            )
            member_count = len(csv_imports)
            LOGGER.info("Found %d CSV files in archive %r", member_count, prepared_import.filename)

            for index, (member, variable_name) in enumerate(csv_imports, start=1):
                LOGGER.info(
                    "[%d/%d] Importing %r from %r", index, member_count, member.filename, prepared_import.filename
                )
                await self._run_import(
                    upload_type=prepared_import.upload_type,
                    data=_read_csv_member(archive, member, prepared_import.filename),
                    variable_name=variable_name,
                    source_name=f"{prepared_import.filename}::{member.filename}",
                )

    async def _run_import(self, upload_type: UploadType, data: bytes, variable_name: str, *, source_name: str) -> None:
        """Delegate one CSV import and attach its source to validation errors."""
        if not data:
            raise ImportValidationError(f"CSV file {source_name!r} is empty.")

        try:
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
                    raise ImportValidationError(f"Unsupported upload type: {upload_type!r}")
        except ValueError as error:
            raise ImportValidationError(f"Could not import {source_name!r}: {error}") from error
