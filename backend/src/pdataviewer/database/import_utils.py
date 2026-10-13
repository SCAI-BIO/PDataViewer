import io
import math
from decimal import Decimal, InvalidOperation
from numbers import Integral
from typing import Any

import pandas as pd


def read_csv_bytes(csv_data: bytes, *, source_name: str, **read_csv_kwargs: Any) -> pd.DataFrame:
    """Read a complete CSV from bytes and provide a source-specific error.

    Iterator and chunked reads are not supported. Callers should specify dtypes
    for identifiers or numeric text whose precision must survive CSV parsing.
    """
    if not csv_data:
        raise ValueError(f"{source_name} is empty")

    iterator = read_csv_kwargs.pop("iterator", False)
    chunksize = read_csv_kwargs.pop("chunksize", None)

    if iterator or chunksize is not None:
        raise ValueError(f"Could not read {source_name}: iterator and chunksize are not supported")

    try:
        return pd.read_csv(io.BytesIO(csv_data), iterator=False, chunksize=None, **read_csv_kwargs)
    except (pd.errors.EmptyDataError, pd.errors.ParserError, UnicodeDecodeError) as exc:
        raise ValueError(f"Could not read {source_name}: {exc}") from exc


def require_columns(dataframe: pd.DataFrame, required_columns: set[str], *, source_name: str) -> None:
    """Raise an error when a dataframe is missing required columns."""
    missing_columns = required_columns.difference(dataframe.columns)

    if missing_columns:
        missing = ", ".join(sorted(missing_columns))
        raise ValueError(f"{source_name} is missing required columns: {missing}")


def is_missing_scalar(value: Any) -> bool:
    """Return whether a scalar dataframe value represents missing data.

    The caller must provide a scalar, not an array or other collection.
    """
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
    """Convert a scalar to an integer without rounding textual values.

    Integer inputs are preserved directly. Strings and Decimal values are
    checked exactly; other inputs must convert to a finite, integral float.
    """
    if is_missing_scalar(value):
        raise ValueError(f"{field_name} is missing")

    if isinstance(value, Integral):
        return int(value)

    try:
        if isinstance(value, (str, Decimal)):
            numeric_value = Decimal(value)

            if not numeric_value.is_finite() or numeric_value != numeric_value.to_integral_value():
                raise ValueError

            return int(numeric_value)

        numeric_float = float(value)

        if not math.isfinite(numeric_float) or not numeric_float.is_integer():
            raise ValueError

        return int(numeric_float)
    except (TypeError, ValueError, OverflowError, InvalidOperation) as exc:
        raise ValueError(f"{field_name} must be an integer") from exc


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
    except (TypeError, ValueError, OverflowError) as exc:
        raise ValueError(f"{field_name} must be numeric") from exc

    if not math.isfinite(numeric_value):
        raise ValueError(f"{field_name} must be finite")

    return numeric_value
