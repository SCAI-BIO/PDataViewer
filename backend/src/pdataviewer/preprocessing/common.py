import os
import re
import shutil
from pathlib import Path
from tempfile import mkdtemp
from typing import Any

import numpy as np
import pandas as pd

BACKEND_DIRECTORY = Path(__file__).resolve().parents[3]
DEFAULT_DATA_DIRECTORY = Path(os.getenv("PDATAVIEWER_DATA_DIRECTORY", BACKEND_DIRECTORY / "data"))

MISSING_TOTAL_SCORE = "No total score."
MAPPING_SEPARATOR = ", "
IGNORED_CDM_COLUMNS = ["CURIE", "Definition", "Synonyms"]
INVALID_FILENAME_CHARACTERS = re.compile(r'[\x00-\x1f\\/*?:"<>|]')
RESERVED_WINDOWS_FILENAME = re.compile(
    r"(?:CON|PRN|AUX|NUL|CONIN\$|CONOUT\$|(?:COM|LPT)[1-9\u00b9\u00b2\u00b3])",
    re.IGNORECASE,
)

type ScalarValue = str | int | float | bool


def require_columns(dataframe: pd.DataFrame, required_columns: set[str], source_name: str) -> None:
    """Raise an error when a dataframe is missing required columns."""
    missing_columns = required_columns.difference(dataframe.columns)

    if missing_columns:
        missing = ", ".join(sorted(missing_columns))
        raise ValueError(f"{source_name} is missing required columns: {missing}")


def is_missing_scalar(value: Any) -> bool:
    """Return whether a scalar value represents missing data.

    The caller must provide a scalar, not an array or other collection.
    """
    return bool(pd.isna(value))


def to_python_scalar(value: object) -> ScalarValue:
    """Convert a non-missing dataframe cell to a supported Python scalar.

    Callers must filter missing values before conversion. Unsupported scalar
    types are converted to strings.
    """
    if isinstance(value, np.generic):
        value = value.item()

    if isinstance(value, (str, int, float, bool)):
        return value

    return str(value)


def first_mapping_term(value: object) -> str | None:
    """Return the first mapped source column, or None when it is empty."""
    if is_missing_scalar(value):
        return None

    first_term = str(value).strip().partition(MAPPING_SEPARATOR)[0].strip()
    return first_term or None


def sanitize_filename(value: str) -> str:
    """Replace invalid filename characters and avoid Windows reserved names.

    Reserved names receive a leading underscore. Callers must check for
    collisions between names after sanitization.
    """
    sanitized = INVALID_FILENAME_CHARACTERS.sub("-", value).strip().rstrip(" .")

    if not sanitized:
        raise ValueError(f"Variable name {value!r} cannot be converted to a valid filename")

    basename = sanitized.partition(".")[0].rstrip(" ")

    if RESERVED_WINDOWS_FILENAME.fullmatch(basename):
        sanitized = f"_{sanitized}"

    return sanitized


def load_cdm_mappings(cdm_directory: Path) -> pd.DataFrame:
    """Validate and combine CDM mapping CSV files, skipping unused columns."""
    cdm_files = sorted(cdm_directory.glob("*.csv"))

    if not cdm_files:
        raise FileNotFoundError(f"No CDM CSV files found in {cdm_directory}")

    dataframes: list[pd.DataFrame] = []

    for cdm_file in cdm_files:
        dataframe = pd.read_csv(
            cdm_file,
            na_values=[MISSING_TOTAL_SCORE],
            usecols=lambda column: column not in IGNORED_CDM_COLUMNS,
        )
        require_columns(dataframe, {"Feature", "Rank"}, cdm_file.name)
        dataframes.append(dataframe)

    return pd.concat(dataframes, ignore_index=True)


def validate_output_directory(output_directory: Path) -> None:
    """Require a dedicated CSV export directory before replacing an existing export."""
    if output_directory.is_symlink():
        raise ValueError(f"Output directory must not be a symbolic link: {output_directory}")

    if not output_directory.exists():
        return

    if not output_directory.is_dir():
        raise NotADirectoryError(f"Output path is not a directory: {output_directory}")

    unexpected_entries = sorted(
        entry.name
        for entry in output_directory.iterdir()
        if entry.is_symlink() or not entry.is_file() or entry.suffix.casefold() != ".csv"
    )

    if unexpected_entries:
        raise ValueError(
            f"Output directory must contain only generated CSV files: {output_directory}. "
            f"Unexpected entries: {', '.join(unexpected_entries)}"
        )


def publish_output_directory(staging_directory: Path, output_directory: Path) -> None:
    """Publish a complete export, restoring the previous directory if publication fails."""
    if not output_directory.exists():
        staging_directory.replace(output_directory)
        return

    backup_container = Path(mkdtemp(prefix=f".{output_directory.name}-backup-", dir=output_directory.parent))
    previous_directory = backup_container / "previous"

    try:
        output_directory.replace(previous_directory)
    except OSError:
        backup_container.rmdir()
        raise

    try:
        staging_directory.replace(output_directory)
    except OSError:
        try:
            previous_directory.replace(output_directory)
        except OSError as restore_error:
            raise RuntimeError(
                f"Could not publish the new export or restore the previous one. "
                f"Previous files remain at {previous_directory}"
            ) from restore_error

        backup_container.rmdir()
        raise

    shutil.rmtree(backup_container)
