from __future__ import annotations

import secrets
from pathlib import Path
from typing import TypeAlias, TypedDict

import pandas as pd

from preprocessing.common import (
    DEFAULT_DATA_DIRECTORY,
    ScalarValue,
    first_mapping_term,
    is_missing_scalar,
    load_cdm_mappings,
    require_columns,
    sanitize_filename,
    to_python_scalar,
)

BASELINE_MONTH = 0
NUMERIC_VARIABLE_RANK = 2


class MeasurementRecord(TypedDict):
    measurement: ScalarValue
    diagnosis: ScalarValue


ExtractedVariables: TypeAlias = dict[str, dict[str, list[MeasurementRecord]]]


def load_numeric_variable_mappings(cdm_directory: Path) -> pd.DataFrame:
    """Load CDM mappings and retain variables with a numeric rank."""
    merged_dataframe = load_cdm_mappings(cdm_directory)
    numeric_rank = pd.to_numeric(merged_dataframe["Rank"], errors="coerce")
    return merged_dataframe.loc[numeric_rank.eq(NUMERIC_VARIABLE_RANK)].copy()


def load_baseline_cohorts(patient_level_directory: Path) -> dict[str, pd.DataFrame]:
    """Load patient-level cohort data and retain baseline visits."""
    patient_level_files = sorted(patient_level_directory.glob("*.csv"))

    if not patient_level_files:
        raise FileNotFoundError("No patient-level CSV files found in " f"{patient_level_directory}")

    cohorts: dict[str, pd.DataFrame] = {}

    for cohort_file in patient_level_files:
        dataframe = pd.read_csv(cohort_file, index_col=0, low_memory=False)
        require_columns(dataframe, {"Months", "Diagnosis"}, cohort_file.name)
        months = pd.to_numeric(dataframe["Months"], errors="coerce")
        baseline_dataframe = dataframe.loc[months.eq(BASELINE_MONTH)].copy()
        baseline_dataframe = baseline_dataframe.dropna(axis=1, how="all")
        cohorts[cohort_file.stem] = baseline_dataframe

    return cohorts


def extract_variables(cohort_data: dict[str, pd.DataFrame], mapping_dataframe: pd.DataFrame) -> ExtractedVariables:
    """Extract mapped measurements and diagnoses for each cohort."""
    require_columns(mapping_dataframe, {"Feature"}, "Variable mapping data")
    mapped_cohorts = [cohort for cohort in cohort_data if cohort in mapping_dataframe.columns]
    extracted: ExtractedVariables = {}

    for _, mapping_row in mapping_dataframe.iterrows():
        raw_variable = mapping_row["Feature"]

        if is_missing_scalar(raw_variable):
            continue

        variable = str(raw_variable).strip()

        if not variable:
            continue

        for cohort in mapped_cohorts:
            dataframe = cohort_data[cohort]
            require_columns(dataframe, {"Diagnosis"}, f"Cohort {cohort}")
            mapped_column = first_mapping_term(mapping_row[cohort])

            if mapped_column is None or mapped_column not in dataframe.columns:
                continue

            valid_rows = dataframe.loc[
                dataframe[mapped_column].notna() & dataframe["Diagnosis"].notna(), [mapped_column, "Diagnosis"]
            ]

            if valid_rows.empty:
                continue

            records = [
                MeasurementRecord(measurement=to_python_scalar(measurement), diagnosis=to_python_scalar(diagnosis))
                for measurement, diagnosis in valid_rows.itertuples(index=False, name=None)
            ]

            extracted.setdefault(variable, {}).setdefault(cohort, []).extend(records)

    return extracted


def _build_output_dataframe(variable_data: dict[str, list[MeasurementRecord]]) -> pd.DataFrame:
    """Create a randomly ordered dataframe for one variable."""
    rows = [
        {"cohort": cohort, "measurement": record["measurement"], "diagnosis": record["diagnosis"]}
        for cohort, records in variable_data.items()
        for record in records
    ]

    if not rows:
        return pd.DataFrame(columns=["participantNumber", "cohort", "measurement", "diagnosis"])

    secrets.SystemRandom().shuffle(rows)

    dataframe = pd.DataFrame(rows, columns=["cohort", "measurement", "diagnosis"])
    dataframe.insert(0, "participantNumber", dataframe.groupby("cohort", sort=False).cumcount())
    return dataframe


def write_variable_files(extracted_variables: ExtractedVariables, output_directory: Path) -> None:
    """Write one randomly ordered CSV file for each variable."""
    output_directory.mkdir(parents=True, exist_ok=True)
    used_filenames: dict[str, str] = {}

    for variable, variable_data in extracted_variables.items():
        output_dataframe = _build_output_dataframe(variable_data)

        if output_dataframe.empty:
            continue

        filename = sanitize_filename(variable)
        collision_key = filename.casefold()

        existing_variable = used_filenames.setdefault(collision_key, variable)

        if existing_variable != variable:
            raise ValueError(
                f"Variables {existing_variable!r} and {variable!r} resolve to the same output filename: {filename}.csv"
            )

        output_dataframe = output_dataframe.set_index(["participantNumber", "cohort"])
        output_dataframe.to_csv(output_directory / f"{filename}.csv")


def main(data_directory: Path = DEFAULT_DATA_DIRECTORY) -> None:
    """Generate processed biomarker data files."""
    numeric_variables = load_numeric_variable_mappings(data_directory / "cdm")
    cohort_studies = load_baseline_cohorts(data_directory / "patient_level")
    extracted_variables = extract_variables(cohort_studies, numeric_variables)
    write_variable_files(extracted_variables, data_directory / "processed" / "biomarker")


if __name__ == "__main__":
    main()
