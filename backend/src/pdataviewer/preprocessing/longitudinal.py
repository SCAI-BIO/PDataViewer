from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryDirectory

import pandas as pd

from pdataviewer.preprocessing.common import (
    DEFAULT_DATA_DIRECTORY,
    first_mapping_term,
    is_missing_scalar,
    load_cdm_mappings,
    publish_output_directory,
    require_columns,
    sanitize_filename,
    validate_output_directory,
)

IGNORED_VARIABLE_RANK = 0
LONGITUDINAL_COLUMNS = ["months", "patientCount", "totalPatientCount", "cohort"]

type LongitudinalVariables = dict[str, pd.DataFrame]
type VariableMappings = dict[str, dict[str, list[str]]]


@dataclass(frozen=True, slots=True)
class _PreparedCohort:
    dataframe: pd.DataFrame
    visits: pd.DataFrame
    valid_visit_mask: pd.Series
    total_participant_count: int


def load_longitudinal_variable_mappings(cdm_directory: Path) -> pd.DataFrame:
    """Load CDM mappings and exclude variables marked to be ignored."""
    merged_dataframe = load_cdm_mappings(cdm_directory)
    variable_rank = pd.to_numeric(merged_dataframe["Rank"], errors="coerce")
    return merged_dataframe.loc[variable_rank.notna() & variable_rank.ne(IGNORED_VARIABLE_RANK)]


def load_participant_data(patient_level_directory: Path) -> dict[str, pd.DataFrame]:
    """Load participant data without dropping required or all-missing columns."""
    participant_level_files = sorted(patient_level_directory.glob("*.csv"))

    if not participant_level_files:
        raise FileNotFoundError(f"No patient-level CSV files found in {patient_level_directory}")

    participant_data: dict[str, pd.DataFrame] = {}

    for cohort_file in participant_level_files:
        dataframe = pd.read_csv(cohort_file, low_memory=False)
        require_columns(dataframe, {"ID", "Months"}, cohort_file.name)
        participant_data[cohort_file.stem] = dataframe

    return participant_data


def _collect_variable_mappings(cdm: pd.DataFrame, participant_data: dict[str, pd.DataFrame]) -> VariableMappings:
    """Collect distinct mapped source columns for each variable and cohort."""
    require_columns(cdm, {"Feature"}, "CDM mapping data")
    mapped_cohorts = [cohort for cohort in participant_data if cohort in cdm.columns]
    mapping_columns = ["Feature", *mapped_cohorts]
    seen_mappings: set[tuple[str, str, str]] = set()
    mappings: VariableMappings = {}

    for raw_variable, *mapping_terms in cdm[mapping_columns].itertuples(index=False, name=None):
        if is_missing_scalar(raw_variable):
            continue

        variable = str(raw_variable).strip()

        if not variable:
            continue

        variable_mappings = mappings.setdefault(variable, {})

        for cohort, raw_mapping in zip(mapped_cohorts, mapping_terms, strict=True):
            mapped_column = first_mapping_term(raw_mapping)

            if mapped_column is None or mapped_column not in participant_data[cohort].columns:
                continue

            mapping_key = (variable, cohort, mapped_column)

            if mapping_key in seen_mappings:
                continue

            seen_mappings.add(mapping_key)
            variable_mappings.setdefault(cohort, []).append(mapped_column)

    return mappings


def _prepare_cohort(cohort: str, dataframe: pd.DataFrame) -> _PreparedCohort:
    """Prepare visit metadata and the cohort-wide denominator once per cohort."""
    require_columns(dataframe, {"ID", "Months"}, f"Cohort {cohort}")
    participant_ids = dataframe["ID"]
    months = pd.to_numeric(dataframe["Months"], errors="coerce")

    return _PreparedCohort(
        dataframe=dataframe,
        visits=pd.DataFrame({"ID": participant_ids, "Months": months}),
        valid_visit_mask=participant_ids.notna() & months.notna(),
        total_participant_count=int(participant_ids.nunique(dropna=True)),
    )


def _extract_cohort_counts(cohort: str, cohort_data: _PreparedCohort, mapped_columns: list[str]) -> pd.DataFrame:
    """Count each participant once per month when any mapped column has data."""
    has_measurement = cohort_data.dataframe[mapped_columns].notna().any(axis=1)
    valid_rows = cohort_data.visits.loc[cohort_data.valid_visit_mask & has_measurement]

    if valid_rows.empty:
        return pd.DataFrame(columns=LONGITUDINAL_COLUMNS)

    participant_counts = valid_rows.groupby("Months", sort=True)["ID"].nunique()
    counts = participant_counts.rename_axis("months").reset_index(name="patientCount")
    counts["totalPatientCount"] = cohort_data.total_participant_count
    counts["cohort"] = cohort
    return counts


def extract_longitudinal_variables(
    cdm: pd.DataFrame, participant_data: dict[str, pd.DataFrame]
) -> LongitudinalVariables:
    """Extract counts while reusing prepared cohort metadata across variables.

    The denominator includes every distinct non-missing ID in the cohort,
    including participants without a valid month or a mapped measurement.
    """
    variable_mappings = _collect_variable_mappings(cdm, participant_data)
    required_cohorts = {cohort for cohort_mappings in variable_mappings.values() for cohort in cohort_mappings}
    prepared_cohorts = {
        cohort: _prepare_cohort(cohort, dataframe)
        for cohort, dataframe in participant_data.items()
        if cohort in required_cohorts
    }
    longitudinal: LongitudinalVariables = {}

    for variable, cohort_mappings in variable_mappings.items():
        frames: list[pd.DataFrame] = []

        for cohort, mapped_columns in cohort_mappings.items():
            counts = _extract_cohort_counts(cohort, prepared_cohorts[cohort], mapped_columns)

            if not counts.empty:
                frames.append(counts)

        longitudinal[variable] = (
            pd.concat(frames, ignore_index=True) if frames else pd.DataFrame(columns=LONGITUDINAL_COLUMNS)
        )

    return longitudinal


def _prepare_output_filenames(longitudinal_variables: LongitudinalVariables) -> dict[str, str]:
    """Validate schemas and filenames before writing any CSV files."""
    filenames: dict[str, str] = {}
    used_filenames: dict[str, str] = {}

    for variable, dataframe in longitudinal_variables.items():
        if dataframe.empty:
            continue

        require_columns(dataframe, set(LONGITUDINAL_COLUMNS), f"Longitudinal variable {variable!r}")
        filename = sanitize_filename(variable)
        collision_key = filename.casefold()
        existing_variable = used_filenames.setdefault(collision_key, variable)

        if existing_variable != variable:
            raise ValueError(
                f"Variables {existing_variable!r} and {variable!r} resolve to the same output filename: {filename}.csv"
            )

        filenames[variable] = f"{filename}.csv"

    return filenames


def write_longitudinal_files(longitudinal_variables: LongitudinalVariables, output_directory: Path) -> None:
    """Replace a dedicated longitudinal CSV export after all files are generated.

    Stale CSV files are removed; an empty result publishes an empty directory.
    Run only one writer at a time. The directory swap uses two renames and is
    not an atomic exchange for readers.
    """
    filenames = _prepare_output_filenames(longitudinal_variables)
    validate_output_directory(output_directory)
    output_directory.parent.mkdir(parents=True, exist_ok=True)

    with TemporaryDirectory(
        prefix=f".{output_directory.name}-staging-", dir=output_directory.parent
    ) as temporary_directory:
        staging_directory = Path(temporary_directory) / "export"
        staging_directory.mkdir()

        for variable, filename in filenames.items():
            output_dataframe = longitudinal_variables[variable][LONGITUDINAL_COLUMNS].set_index(["months", "cohort"])
            output_dataframe.to_csv(staging_directory / filename)

        publish_output_directory(staging_directory, output_directory)


def main(data_directory: Path = DEFAULT_DATA_DIRECTORY) -> None:
    """Generate local longitudinal CSV files for import through the API."""
    cdm = load_longitudinal_variable_mappings(data_directory / "cdm")
    participant_data = load_participant_data(data_directory / "patient_level")
    longitudinal_variables = extract_longitudinal_variables(cdm, participant_data)
    write_longitudinal_files(longitudinal_variables, data_directory / "processed" / "longitudinal")


if __name__ == "__main__":
    main()
