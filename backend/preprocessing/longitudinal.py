from __future__ import annotations

from pathlib import Path
from typing import TypeAlias

import pandas as pd

from preprocessing.common import (
    DEFAULT_DATA_DIRECTORY,
    first_mapping_term,
    is_missing_scalar,
    load_cdm_mappings,
    require_columns,
    sanitize_filename,
)

IGNORED_VARIABLE_RANK = 0

LongitudinalVariables: TypeAlias = dict[str, pd.DataFrame]
VariableMappings: TypeAlias = dict[str, dict[str, list[str]]]

LONGITUDINAL_COLUMNS = ["months", "patientCount", "totalPatientCount", "cohort"]


def load_longitudinal_variable_mappings(cdm_directory: Path) -> pd.DataFrame:
    """Load CDM mappings and exclude variables marked to be ignored."""
    merged_dataframe = load_cdm_mappings(cdm_directory)
    variable_rank = pd.to_numeric(merged_dataframe["Rank"], errors="coerce")
    return merged_dataframe.loc[variable_rank.notna() & variable_rank.ne(IGNORED_VARIABLE_RANK)].copy()


def load_participant_data(patient_level_directory: Path) -> dict[str, pd.DataFrame]:
    """Load participant-level data for all cohorts."""
    participant_level_files = sorted(patient_level_directory.glob("*.csv"))

    if not participant_level_files:
        raise FileNotFoundError("No patient-level CSV files found in " f"{patient_level_directory}")

    participant_data: dict[str, pd.DataFrame] = {}

    for cohort_file in participant_level_files:
        dataframe = pd.read_csv(cohort_file, low_memory=False)
        require_columns(dataframe, {"ID", "Months"}, cohort_file.name)
        dataframe = dataframe.dropna(axis=1, how="all")
        participant_data[cohort_file.stem] = dataframe

    return participant_data


def _collect_variable_mappings(cdm: pd.DataFrame, participant_data: dict[str, pd.DataFrame]) -> VariableMappings:
    """Collect valid mapped columns for each variable and cohort."""
    require_columns(cdm, {"Feature"}, "CDM mapping data")
    mapped_cohorts = [cohort for cohort in participant_data if cohort in cdm.columns]

    mappings: VariableMappings = {}

    for _, mapping_row in cdm.iterrows():
        raw_variable = mapping_row["Feature"]

        if is_missing_scalar(raw_variable):
            continue

        variable = str(raw_variable).strip()

        if not variable:
            continue

        variable_mappings = mappings.setdefault(variable, {})

        for cohort in mapped_cohorts:
            mapped_column = first_mapping_term(mapping_row[cohort])

            if mapped_column is None:
                continue

            cohort_dataframe = participant_data[cohort]

            if mapped_column not in cohort_dataframe.columns:
                continue

            cohort_mappings = variable_mappings.setdefault(cohort, [])

            if mapped_column not in cohort_mappings:
                cohort_mappings.append(mapped_column)

    return mappings


def _extract_cohort_counts(
    cohort: str, cohort_data: pd.DataFrame, mapped_columns: list[str]
) -> list[dict[str, object]]:
    """Count participants with mapped data at each visit."""
    require_columns(cohort_data, {"ID", "Months"}, f"Cohort {cohort}")
    total_participant_count = int(cohort_data["ID"].nunique(dropna=True))
    months = pd.to_numeric(cohort_data["Months"], errors="coerce")
    has_measurement = cohort_data[mapped_columns].notna().any(axis=1)

    valid_rows = pd.DataFrame({"ID": cohort_data["ID"], "Months": months}).loc[
        cohort_data["ID"].notna() & months.notna() & has_measurement
    ]

    if valid_rows.empty:
        return []

    participant_counts = valid_rows.groupby("Months", sort=True)["ID"].nunique()

    return [
        {
            "months": visit_month,
            "patientCount": int(participant_count),
            "totalPatientCount": total_participant_count,
            "cohort": cohort,
        }
        for visit_month, participant_count in participant_counts.items()
    ]


def extract_longitudinal_variables(
    cdm: pd.DataFrame, participant_data: dict[str, pd.DataFrame]
) -> LongitudinalVariables:
    """Extract longitudinal participant counts across cohorts."""
    variable_mappings = _collect_variable_mappings(cdm, participant_data)

    longitudinal: LongitudinalVariables = {}

    for variable, cohort_mappings in variable_mappings.items():
        rows = [
            row
            for cohort, mapped_columns in cohort_mappings.items()
            for row in _extract_cohort_counts(cohort, participant_data[cohort], mapped_columns)
        ]

        longitudinal[variable] = pd.DataFrame(rows, columns=LONGITUDINAL_COLUMNS)

    return longitudinal


def write_longitudinal_files(longitudinal_variables: LongitudinalVariables, output_directory: Path) -> None:
    """Write one longitudinal CSV file for each variable."""
    output_directory.mkdir(parents=True, exist_ok=True)

    used_filenames: dict[str, str] = {}

    for variable, dataframe in longitudinal_variables.items():
        if dataframe.empty:
            continue

        filename = sanitize_filename(variable)
        collision_key = filename.casefold()

        existing_variable = used_filenames.setdefault(collision_key, variable)

        if existing_variable != variable:
            raise ValueError(
                f"Variables {existing_variable!r} and "
                f"{variable!r} resolve to the same output "
                f"filename: {filename}.csv"
            )

        output_dataframe = dataframe.set_index(["months", "cohort"])

        output_dataframe.to_csv(output_directory / f"{filename}.csv")


def main(data_directory: Path = DEFAULT_DATA_DIRECTORY) -> None:
    """Generate processed longitudinal data files."""
    cdm = load_longitudinal_variable_mappings(data_directory / "cdm")
    participant_data = load_participant_data(data_directory / "patient_level")
    longitudinal_variables = extract_longitudinal_variables(cdm, participant_data)
    write_longitudinal_files(longitudinal_variables, data_directory / "processed" / "longitudinal")


if __name__ == "__main__":
    main()
