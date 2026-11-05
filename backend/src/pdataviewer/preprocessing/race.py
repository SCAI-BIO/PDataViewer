from pathlib import Path

import pandas as pd

from pdataviewer.preprocessing.common import (
    DEFAULT_DATA_DIRECTORY,
    first_mapping_term,
    load_cdm_mappings,
    require_columns,
)

RACE_COHORTS = ("PPMI", "BIOFIND", "PostCEPT", "SPARX", "Fox Insight")
RACE_CATEGORIES = (
    "White",
    "Asian",
    "Black or African American",
    "Native Hawaiian or Other Pacific Islander",
    "American Indian or Alaska Native",
)
RACE_FEATURE_PREFIX = "Race - "
OUTPUT_COLUMNS = ("cohort", "race", "selected_count", "valid_count", "unknown_count", "missing_count")
UNKNOWN_CODE_COHORTS = frozenset({"SPARX", "PostCEPT"})


def load_race_mappings(cdm_directory: Path) -> dict[str, dict[str, str]]:
    """Resolve each cohort's five race fields using the CDM mappings."""
    cdm = load_cdm_mappings(cdm_directory)
    require_columns(cdm, {"Feature", *RACE_COHORTS}, "CDM mapping data")

    feature_names = {f"{RACE_FEATURE_PREFIX}{category}" for category in RACE_CATEGORIES}
    race_rows = cdm.loc[cdm["Feature"].isin(feature_names)]

    if race_rows["Feature"].duplicated().any():
        raise ValueError("CDM mapping data contains duplicate race features")

    indexed = race_rows.set_index("Feature")
    missing_features = feature_names.difference(indexed.index)

    if missing_features:
        raise ValueError(f"CDM mapping data is missing race features: {', '.join(sorted(missing_features))}")

    mappings: dict[str, dict[str, str]] = {}

    for cohort in RACE_COHORTS:
        cohort_mappings: dict[str, str] = {}
        for category in RACE_CATEGORIES:

            if len(set(cohort_mappings.values())) != len(cohort_mappings):
                raise ValueError(f"Duplicate source race columns mapped for {cohort}")

            source_column = first_mapping_term(indexed.at[f"{RACE_FEATURE_PREFIX}{category}", cohort])

            if source_column is None:
                raise ValueError(f"Missing CDM race mappings for {cohort}: {category}")

            cohort_mappings[category] = source_column
        mappings[cohort] = cohort_mappings

    return mappings


def load_race_cohorts(patient_level_directory: Path) -> dict[str, pd.DataFrame]:
    """Load baseline race data, retaining the first record per participant."""
    cohorts: dict[str, pd.DataFrame] = {}

    for cohort in RACE_COHORTS:
        source_file = patient_level_directory / f"{cohort}.csv"
        if not source_file.is_file():
            raise FileNotFoundError(f"Race source file not found: {source_file}")

        dataframe = pd.read_csv(source_file, dtype={"ID": "string"}, low_memory=False)
        require_columns(dataframe, {"ID", "Months"}, source_file.name)
        baseline = dataframe.loc[pd.to_numeric(dataframe["Months"], errors="coerce").eq(0)].copy()
        baseline["ID"] = baseline["ID"].str.strip()
        baseline = baseline.loc[baseline["ID"].notna() & baseline["ID"].ne("")].copy()

        if baseline.empty:
            raise ValueError(f"No valid baseline participants in {source_file.name}")

        if baseline["ID"].duplicated().any():
            duplicates = baseline.loc[baseline["ID"].duplicated(keep=False), "ID"]

            print(f"\nDuplicate baseline participants in {source_file.name}:")
            print(duplicates.value_counts().to_string())

            baseline = baseline.drop_duplicates(subset="ID", keep="first")

        cohorts[cohort] = baseline

    return cohorts


def _count_race_responses(cohort: str, category: str, dataframe: pd.DataFrame, column: str) -> dict[str, str | int]:
    """Count selected, not selected, and unknown baseline race responses."""
    raw_values = dataframe[column].astype("string").str.strip()
    raw_values = raw_values.mask(raw_values.eq(""))
    codes = pd.to_numeric(raw_values, errors="coerce")

    allowed_codes = (0, 1, 2) if cohort in UNKNOWN_CODE_COHORTS else (0, 1)
    invalid = raw_values.notna() & ~codes.isin(allowed_codes)

    if invalid.any():
        examples = raw_values.loc[invalid].drop_duplicates().head(5).tolist()
        raise ValueError(f"{cohort}: {category} ({column}) has {int(invalid.sum())} invalid responses: {examples}")

    # Missing values represent an unselected race.
    codes = codes.fillna(0)

    return {
        "cohort": cohort,
        "race": category,
        "selected_count": int(codes.eq(1).sum()),
        "valid_count": int(codes.isin((0, 1)).sum()),
        "unknown_count": int(codes.eq(2).sum()),
        "missing_count": 0,
    }


def extract_race_counts(cohorts: dict[str, pd.DataFrame], mappings: dict[str, dict[str, str]]) -> pd.DataFrame:
    """Generate one aggregated record per cohort and race category."""
    records: list[dict[str, str | int]] = []

    for cohort, category_mappings in mappings.items():
        dataframe = cohorts[cohort]
        require_columns(dataframe, set(category_mappings.values()), f"{cohort} participant data")

        for category, column in category_mappings.items():
            records.append(_count_race_responses(cohort, category, dataframe, column))

    return pd.DataFrame(records, columns=list(OUTPUT_COLUMNS))


def write_race_counts(race_counts: pd.DataFrame, output_directory: Path) -> None:
    """Write the single CSV expected by CohortRaceRepository.import_counts()."""
    output_directory.mkdir(parents=True, exist_ok=True)
    race_counts.to_csv(output_directory / "race_counts.csv", index=False)


def main(data_directory: Path = DEFAULT_DATA_DIRECTORY) -> None:
    """Generate processed race counts from mapped participant-level data."""
    mappings = load_race_mappings(data_directory / "cdm")
    cohorts = load_race_cohorts(data_directory / "patient_level")
    counts = extract_race_counts(cohorts, mappings)
    write_race_counts(counts, data_directory / "processed" / "race")


if __name__ == "__main__":
    main()
