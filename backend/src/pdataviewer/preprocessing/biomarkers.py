import secrets
from collections.abc import Iterator
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import TypedDict

import pandas as pd

from pdataviewer.preprocessing.common import (
    DEFAULT_DATA_DIRECTORY,
    ScalarValue,
    first_mapping_term,
    is_missing_scalar,
    load_cdm_mappings,
    publish_output_directory,
    require_columns,
    sanitize_filename,
    to_python_scalar,
    validate_output_directory,
)

BASELINE_MONTH = 0
NUMERIC_VARIABLE_RANK = 2
OUTPUT_COLUMNS = ["participantNumber", "cohort", "measurement", "diagnosis"]


class MeasurementRecord(TypedDict):
    measurement: ScalarValue
    diagnosis: ScalarValue


type ExtractedVariables = dict[str, dict[str, list[MeasurementRecord]]]


def load_numeric_variable_mappings(cdm_directory: Path) -> pd.DataFrame:
    """Load CDM mappings and retain variables with a numeric rank."""
    merged_dataframe = load_cdm_mappings(cdm_directory)
    numeric_rank = pd.to_numeric(merged_dataframe["Rank"], errors="coerce")
    return merged_dataframe.loc[numeric_rank.eq(NUMERIC_VARIABLE_RANK)]


def load_baseline_cohorts(patient_level_directory: Path) -> dict[str, pd.DataFrame]:
    """Load baseline visits without dropping required or all-missing columns."""
    patient_level_files = sorted(patient_level_directory.glob("*.csv"))

    if not patient_level_files:
        raise FileNotFoundError(f"No patient-level CSV files found in {patient_level_directory}")

    cohorts: dict[str, pd.DataFrame] = {}

    for cohort_file in patient_level_files:
        dataframe = pd.read_csv(cohort_file, index_col=0, low_memory=False)
        require_columns(dataframe, {"Months", "Diagnosis"}, cohort_file.name)
        months = pd.to_numeric(dataframe["Months"], errors="coerce")
        cohorts[cohort_file.stem] = dataframe.loc[months.eq(BASELINE_MONTH)]

    return cohorts


def _iter_variable_mappings(
    mapping_dataframe: pd.DataFrame, mapped_cohorts: list[str]
) -> Iterator[tuple[str, str, str]]:
    """Yield normalized mappings and reject duplicate variable/cohort/column keys."""
    mapping_columns = ["Feature", *mapped_cohorts]
    seen_mappings: set[tuple[str, str, str]] = set()

    for raw_variable, *mapping_terms in mapping_dataframe[mapping_columns].itertuples(index=False, name=None):
        if is_missing_scalar(raw_variable):
            continue

        variable = str(raw_variable).strip()

        if not variable:
            continue

        for cohort, raw_mapping in zip(mapped_cohorts, mapping_terms, strict=True):
            mapped_column = first_mapping_term(raw_mapping)

            if mapped_column is None:
                continue

            mapping_key = (variable, cohort, mapped_column)

            if mapping_key in seen_mappings:
                raise ValueError(
                    f"Duplicate mapping for variable {variable!r}, cohort {cohort!r}, "
                    f"and source column {mapped_column!r}"
                )

            seen_mappings.add(mapping_key)
            yield mapping_key


def extract_variables(cohort_data: dict[str, pd.DataFrame], mapping_dataframe: pd.DataFrame) -> ExtractedVariables:
    """Extract mapped measurements, preserving repeated values from different rows."""
    require_columns(mapping_dataframe, {"Feature"}, "Variable mapping data")
    mapped_cohorts = [cohort for cohort in cohort_data if cohort in mapping_dataframe.columns]
    diagnosis_masks: dict[str, pd.Series] = {}

    for cohort in mapped_cohorts:
        dataframe = cohort_data[cohort]
        require_columns(dataframe, {"Diagnosis"}, f"Cohort {cohort}")
        diagnosis_masks[cohort] = dataframe["Diagnosis"].notna()

    extracted: ExtractedVariables = {}

    for variable, cohort, mapped_column in _iter_variable_mappings(mapping_dataframe, mapped_cohorts):
        dataframe = cohort_data[cohort]

        if mapped_column not in dataframe.columns:
            continue

        valid_rows = dataframe.loc[
            dataframe[mapped_column].notna() & diagnosis_masks[cohort], [mapped_column, "Diagnosis"]
        ]

        if valid_rows.empty:
            continue

        records = extracted.setdefault(variable, {}).setdefault(cohort, [])
        records.extend(
            MeasurementRecord(measurement=to_python_scalar(measurement), diagnosis=to_python_scalar(diagnosis))
            for measurement, diagnosis in valid_rows.itertuples(index=False, name=None)
        )

    return extracted


def _build_output_dataframe(variable_data: dict[str, list[MeasurementRecord]]) -> pd.DataFrame:
    """Shuffle rows and assign cohort-local numbers independently for each variable."""
    rows = [
        (cohort, record["measurement"], record["diagnosis"])
        for cohort, records in variable_data.items()
        for record in records
    ]

    if not rows:
        return pd.DataFrame(columns=OUTPUT_COLUMNS)

    secrets.SystemRandom().shuffle(rows)

    dataframe = pd.DataFrame(rows, columns=OUTPUT_COLUMNS[1:])
    dataframe.insert(0, "participantNumber", dataframe.groupby("cohort", sort=False).cumcount())
    return dataframe


def _prepare_output_filenames(extracted_variables: ExtractedVariables) -> dict[str, str]:
    """Validate all output filenames before writing any CSV files."""
    filenames: dict[str, str] = {}
    used_filenames: dict[str, str] = {}

    for variable, variable_data in extracted_variables.items():
        if not any(variable_data.values()):
            continue

        filename = sanitize_filename(variable)
        collision_key = filename.casefold()
        existing_variable = used_filenames.setdefault(collision_key, variable)

        if existing_variable != variable:
            raise ValueError(
                f"Variables {existing_variable!r} and {variable!r} resolve to the same output filename: {filename}.csv"
            )

        filenames[variable] = f"{filename}.csv"

    return filenames


def write_variable_files(extracted_variables: ExtractedVariables, output_directory: Path) -> None:
    """Replace a dedicated biomarker CSV export, removing stale files after generation.

    An empty result publishes an empty directory. Run only one writer at a time;
    the directory swap uses two renames and is not an atomic exchange for readers.
    """
    filenames = _prepare_output_filenames(extracted_variables)
    validate_output_directory(output_directory)
    output_directory.parent.mkdir(parents=True, exist_ok=True)

    with TemporaryDirectory(
        prefix=f".{output_directory.name}-staging-", dir=output_directory.parent
    ) as temporary_directory:
        staging_directory = Path(temporary_directory) / "export"
        staging_directory.mkdir()

        for variable, filename in filenames.items():
            output_dataframe = _build_output_dataframe(extracted_variables[variable])
            output_dataframe = output_dataframe.set_index(["participantNumber", "cohort"])
            output_dataframe.to_csv(staging_directory / filename)

        publish_output_directory(staging_directory, output_directory)


def main(data_directory: Path = DEFAULT_DATA_DIRECTORY) -> None:
    """Generate processed biomarker data files."""
    numeric_variables = load_numeric_variable_mappings(data_directory / "cdm")
    cohort_studies = load_baseline_cohorts(data_directory / "patient_level")
    extracted_variables = extract_variables(cohort_studies, numeric_variables)
    write_variable_files(extracted_variables, data_directory / "processed" / "biomarker")


if __name__ == "__main__":
    main()
