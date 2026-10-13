import stat
from pathlib import PurePosixPath
from zipfile import ZipFile, ZipInfo

CSV_SUFFIX = ".csv"
ZIP_SUFFIX = ".zip"
ZIP_UNIX_CREATE_SYSTEM = 3

SUPPORTED_UPLOAD_SUFFIXES = frozenset({CSV_SUFFIX, ZIP_SUFFIX})


def _filename_path(filename: str) -> PurePosixPath:
    """Get the final filename component using either path separator."""
    basename = filename.replace("\\", "/").rsplit("/", maxsplit=1)[-1]
    return PurePosixPath(basename)


def get_file_suffix(filename: str) -> str:
    """Return an uploaded filename's lowercase suffix."""
    return _filename_path(filename).suffix.lower()


def get_variable_name(filename: str) -> str:
    """Extract a non-empty variable name from a filename."""
    variable_name = _filename_path(filename).stem.strip()

    if not variable_name or variable_name in {".", ".."}:
        raise ValueError(f"Could not determine a variable name from {filename!r}")

    return variable_name


def _is_regular_member(member: ZipInfo) -> bool:
    """Exclude directory entries and explicitly marked Unix special files."""
    if member.is_dir() or member.filename.endswith("\\"):
        return False

    if member.external_attr & stat.FILE_ATTRIBUTE_DIRECTORY:
        return False

    if member.create_system == ZIP_UNIX_CREATE_SYSTEM:
        file_type = stat.S_IFMT(member.external_attr >> 16)
        return file_type in {0, stat.S_IFREG}

    return True


def get_csv_members(archive: ZipFile) -> list[ZipInfo]:
    """Return CSV file entries in archive order, excluding directories and Unix special files."""
    return [
        member
        for member in archive.infolist()
        if get_file_suffix(member.filename) == CSV_SUFFIX and _is_regular_member(member)
    ]
