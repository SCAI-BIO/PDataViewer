import pandas as pd
import numpy as np
from random import sample
from pathlib import Path


def extract_features(
    df_dict: dict[str, pd.DataFrame], mapping_df: pd.DataFrame
) -> dict[str, dict[str, int | float]]:
    """Generates a nested dictionary that contains all available measurements for mapped features per cohort.

    Args:
        df_dict (dict[str, pd.DataFrame]): Dictionary of data frames containing cohort data.
        feature_df (pd.DataFrame): Data frame of mapped features.

    Returns:
        result_dict (dict[str, dict[str, int  |  float]]): A nested dictionary. Outer dictionary is the available features, inner dictionary is the measurements for each cohort study.
    """

    result_dict = {}

    for feature in mapping_df.Feature:
        feature_row = mapping_df.loc[mapping_df["Feature"] == feature]

        for cohort in mapping_df.columns.intersection(df_dict.keys()):
            feat = feature_row[cohort].item()

            if feat == 0:
                continue

            if ", " in feat:
                feat = feat.split(", ")[1]

            target_cols = [col for col in df_dict[cohort].columns if feat in col]

            if not target_cols:
                continue

            exact_match = next((col for col in target_cols if col == feat), None)
            selected_col = exact_match if exact_match else target_cols[0]

            measurements = df_dict[cohort][selected_col].dropna().tolist()
            if measurements:
                result_dict.setdefault(feature, {})[cohort] = sample(measurements, len(measurements))

    return result_dict


# Define the base path
base_path = Path("backend/data")

### READ CDM MODALITIES ###
cdm_files = sorted(base_path.glob("cdm/*.csv"))
modalities = [file.stem for file in cdm_files]
dataframes = [pd.read_csv(file) for file in cdm_files]

# Create a dictionary with all modalities as dataframes
all_features = {
    modality.split(" - ")[1]: df for modality, df in zip(modalities, dataframes)
}

# Drop irrelevant columns
for df in all_features.values():
    df.drop(columns=["CURIE", "Definition", "Synonyms"], inplace=True, errors="ignore")

# Combine the modalities into a single dataframe
merged_df = pd.concat(all_features.values(), ignore_index=True)

# Replace "No total score." as the test was performed but the total score was not reported
merged_df.replace({"No total score.": np.nan}, inplace=True)

# Fill all the NaN cells with 0
merged_df.fillna(0, inplace=True)

# Filter numeric features
numeric_features = merged_df.loc[merged_df.Rank == 2]

### READ PATIENT LEVEL DATA ###
patient_level_files = sorted(base_path.glob("patient_level/*.csv"))
cohorts = [file.stem for file in patient_level_files]
datasets = [
    pd.read_csv(file, index_col=0, low_memory=False) for file in patient_level_files
]
# Create a dictionary with all cohorts as dataframes
cohort_studies = {
    cohort: df.loc[(df["Months"] == 0)] for cohort, df in zip(cohorts, datasets)
}

# Make the index column consistent among the cohort dataframes
for cohort, df in cohort_studies.items():
    df["ID"] = df.index
    cohort_studies[cohort] = df.reset_index(drop=True).set_index("ID")
    cohort_studies[cohort].dropna(axis=1, how="all", inplace=True)

result = extract_features(cohort_studies, numeric_features)

# Convert each feature dictionary into a dataframe and save it as csv file
output_path = base_path / "processed"
output_path.mkdir(parents=True, exist_ok=True)

for feature, feature_data in result.items():
    if feature in {"Age", "Education"}:
        for cohort in feature_data:
            feature_data[cohort] = list(map(int, feature_data[cohort]))

    df = pd.DataFrame.from_dict(feature_data, orient="index").transpose()
    df.index.name = "Participant number"
    df.dropna(how="all", axis=1, inplace=True)
    if not df.empty:
        df.to_csv(output_path / f"biomarkers_{feature.lower()}.csv", index_label="Participant number")
