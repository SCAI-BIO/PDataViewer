import io
import zipfile
from dataclasses import dataclass

from api.schemas import UploadType
from api.upload_utils import SUPPORTED_UPLOAD_SUFFIXES, ZIP_SUFFIX, get_file_suffix


class ImportValidationError(ValueError):
    """Raised when an uploaded import file is invalid."""


@dataclass(frozen=True, slots=True)
class PreparedImport:
    """Validated data required by the background import task."""

    filename: str
    contents: bytes
    upload_type: UploadType


def prepare_import(filename: str, contents: bytes, upload_type: UploadType) -> PreparedImport:
    """Validate and normalize an uploaded database import."""
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
