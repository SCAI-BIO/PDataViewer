import re
from pathlib import Path
from typing import Any, TypeAlias

import numpy as np
import pandas as pd

BACKEND_DIRECTORY = Path(__file__).resolve().parents[1]
DEFAULT_DATA_DIRECTORY = BACKEND_DIRECTORY / "data"

MISSING_TOTAL_SCORE = "No total score."
MAPPING_SEPARATOR = ", "
IGNORED_CDM_COLUMNS = ["CURIE", "Definition", "Synonyms"]
INVALID_FILENAME_CHARACTERS = re.compile(r'[\\/*?:"<>|]')
ScalarValue: TypeAlias = str | int | float | bool


def require_columns(dataframe: pd.DataFrame, required_columns: set[str], source_name: str) -> None:
    """Raise an error when a dataframe is missing required columns."""
    missing_columns = required_columns.difference(dataframe.columns)

    if missing_columns:
        missing = ", ".join(sorted(missing_columns))
        raise ValueError(f"{source_name} is missing required columns: {missing}")


def is_missing_scalar(value: Any) -> bool:
    """Return whether a scalar value represents missing data."""
    return bool(pd.isna(value))


def to_python_scalar(value: object) -> ScalarValue:
    """Convert a dataframe cell value to a supported Python scalar."""
    if isinstance(value, np.generic):
        value = value.item()

    if isinstance(value, (str, int, float, bool)):
        return value

    return str(value)


def first_mapping_term(value: Any) -> str | None:
    """Return the first mapped source column from a mapping cell."""
    if is_missing_scalar(value):
        return None

    mapped_column = str(value).strip()

    if not mapped_column:
        return None

    return mapped_column.split(
        MAPPING_SEPARATOR,
        maxsplit=1,
    )[0].strip()


def sanitize_filename(value: str) -> str:
    """Convert a variable name into a valid filename."""
    sanitized = INVALID_FILENAME_CHARACTERS.sub("-", value).strip().rstrip(".")

    if not sanitized:
        raise ValueError(f"Variable name {value!r} cannot be converted " "to a valid filename")

    return sanitized


def load_cdm_mappings(cdm_directory: Path) -> pd.DataFrame:
    """Load and combine all CDM mapping CSV files."""
    cdm_files = sorted(cdm_directory.glob("*.csv"))

    if not cdm_files:
        raise FileNotFoundError(f"No CDM CSV files found in {cdm_directory}")

    dataframes = [
        pd.read_csv(cdm_file, na_values=[MISSING_TOTAL_SCORE]).drop(columns=IGNORED_CDM_COLUMNS, errors="ignore")
        for cdm_file in cdm_files
    ]

    merged_dataframe = pd.concat(dataframes, ignore_index=True)
    require_columns(merged_dataframe, {"Feature", "Rank"}, "CDM mapping data")
    return merged_dataframe
