import pandas as pd
import numpy as np
from pathlib import Path


def extract_features(
    df_dict: dict[str, pd.DataFrame], mapping_df: pd.DataFrame
) -> dict[str, dict[str, list[dict[str, int | float | str]]]]:
    """Generates a nested dictionary that contains all available measurements for mapped features per cohort,
    including diagnosis.

    Args:
        df_dict (dict[str, pd.DataFrame]): Dictionary of data frames containing cohort data.
        feature_df (pd.DataFrame): Data frame of mapped features.

    Returns:
        result_dict (dict[str, dict[str, list[dict[str, int | float | str]]]]): A nested dictionary.
        Outer dictionary is the available features, inner dictionary is the measurements for each cohort study,
        including diagnosis.
    """

    result_dict = {}

    for feature in mapping_df.Feature:
        feature_row = mapping_df.loc[mapping_df["Feature"] == feature]

        for cohort in mapping_df.columns.intersection(list(df_dict.keys())):
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

            # Filter rows where both measurement and diagnosis are valid
            valid_rows = df_dict[cohort][
                (df_dict[cohort][selected_col] != 0)
                & (df_dict[cohort]["Diagnosis"] != 0)
            ]

            if not valid_rows.empty:
                if feature not in result_dict:
                    result_dict[feature] = {}
                if cohort not in result_dict[feature]:
                    result_dict[feature][cohort] = []

                for _, row in valid_rows.iterrows():
                    result_dict[feature][cohort].append(
                        {
                            "Measurement": row[selected_col],
                            "Diagnosis": row["Diagnosis"],
                        }
                    )

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
            feature_data[cohort] = [
                {
                    "Measurement": (
                        int(d["Measurement"]) if not pd.isna(d["Measurement"]) else 0
                    ),
                    "Diagnosis": d["Diagnosis"],
                }
                for d in feature_data[cohort]
            ]

    # Create a list to store the data
    data = []
    for cohort, measurements in feature_data.items():
        for i, measurement in enumerate(measurements):
            data.append(
                {
                    "Participant number": i,
                    "Cohort": cohort,
                    "Measurement": measurement["Measurement"],
                    "Diagnosis": measurement["Diagnosis"],
                }
            )

    # Create the DataFrame
    df = pd.DataFrame(data)

    # Check if DataFrame is empty before saving
    if not df.empty:
        df = df.sample(frac=1)
        df.set_index(["Participant number", "Cohort"], inplace=True)
        df.to_csv(output_path / f"biomarkers_{feature.lower()}.csv")
