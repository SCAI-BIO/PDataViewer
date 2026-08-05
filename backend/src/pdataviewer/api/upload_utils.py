from pathlib import PurePosixPath
from zipfile import ZipFile, ZipInfo

CSV_SUFFIX = ".csv"
ZIP_SUFFIX = ".zip"

SUPPORTED_UPLOAD_SUFFIXES = frozenset({CSV_SUFFIX, ZIP_SUFFIX})


def get_file_suffix(filename: str) -> str:
    """Return an uploaded filename's lowercase suffix."""
    normalized_filename = filename.replace("\\", "/")

    return PurePosixPath(normalized_filename).suffix.lower()


def get_variable_name(filename: str) -> str:
    """Extract a non-empty variable name from a filename."""
    normalized_filename = filename.replace("\\", "/")
    variable_name = PurePosixPath(normalized_filename).stem.strip()

    if not variable_name:
        raise ValueError(f"Could not determine a variable name from {filename!r}")

    return variable_name


def get_csv_members(archive: ZipFile) -> list[ZipInfo]:
    """Return regular CSV files contained in a ZIP archive."""
    return [
        member
        for member in archive.infolist()
        if not member.is_dir() and get_file_suffix(member.filename) == CSV_SUFFIX
    ]
