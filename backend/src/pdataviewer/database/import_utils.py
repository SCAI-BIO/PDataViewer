import io
import math
from typing import Any

import pandas as pd


def read_csv_bytes(csv_data: bytes, *, source_name: str, **read_csv_kwargs: Any) -> pd.DataFrame:
    """Read CSV bytes and provide a source-specific validation error."""
    if not csv_data:
        raise ValueError(f"{source_name} is empty")

    try:
        return pd.read_csv(io.BytesIO(csv_data), **read_csv_kwargs)
    except (pd.errors.EmptyDataError, pd.errors.ParserError, UnicodeDecodeError) as exc:
        raise ValueError(f"Could not read {source_name}: {exc}") from exc


def require_columns(dataframe: pd.DataFrame, required_columns: set[str], *, source_name: str) -> None:
    """Raise an error when a dataframe is missing required columns."""
    missing_columns = required_columns.difference(dataframe.columns)

    if missing_columns:
        missing = ", ".join(sorted(missing_columns))
        raise ValueError(f"{source_name} is missing required columns: {missing}")


def is_missing_scalar(value: Any) -> bool:
    """Return whether a scalar dataframe value represents missing data."""
    return bool(pd.isna(value))


def required_string(value: Any, *, field_name: str) -> str:
    """Convert a required scalar value to a non-empty string."""
    if is_missing_scalar(value):
        raise ValueError(f"{field_name} is missing")

    text = str(value).strip()

    if not text:
        raise ValueError(f"{field_name} is empty")

    return text


def optional_string(value: Any) -> str | None:
    """Convert an optional scalar value to a stripped string."""
    if is_missing_scalar(value):
        return None

    text = str(value).strip()
    return text or None


def required_int(value: Any, *, field_name: str) -> int:
    """Convert a scalar value to an integer without truncation."""
    if is_missing_scalar(value):
        raise ValueError(f"{field_name} is missing")

    try:
        numeric_value = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be an integer") from exc

    if not math.isfinite(numeric_value) or not numeric_value.is_integer():
        raise ValueError(f"{field_name} must be an integer")

    return int(numeric_value)


def optional_int(value: Any, *, field_name: str) -> int | None:
    """Convert an optional scalar value to an integer."""
    if is_missing_scalar(value):
        return None

    return required_int(value, field_name=field_name)


def required_float(value: Any, *, field_name: str) -> float:
    """Convert a scalar value to a finite float."""
    if is_missing_scalar(value):
        raise ValueError(f"{field_name} is missing")

    try:
        numeric_value = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be numeric") from exc

    if not math.isfinite(numeric_value):
        raise ValueError(f"{field_name} must be finite")

    return numeric_value
