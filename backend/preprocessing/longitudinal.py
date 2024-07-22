import pandas as pd
import numpy as np
from pathlib import Path


def extract_longitudinal_features(
    cdm: pd.DataFrame, patient_data: dict[str, pd.DataFrame]
) -> dict[str, pd.DataFrame]:
    """Records the number of patients for the specific feature at each visit in a dictionary.

    Args:
        cdm (pd.DataFrame): PASSIONATE CDM
        patient_data (dict[str, pd.DataFrame]): Dictionary containing the patient level data.
        Keys must be the cohort names and values must be the data itself.

    Returns:
        dict[str, pd.DataFrame]: Longitudinal record of each feature.
        The keys are the feature names specified as in the PASSIONATE CDM, the values are the records
    """
    longitudinal: dict[str, pd.DataFrame] = {}
    for feature in cdm.index:
        longitudinal_feature: pd.DataFrame = pd.DataFrame(
            columns=["Months", "PatientCount", "TotalPatientCount", "Cohort"]
        )
        for cohort in patient_data:
            total_patient_count = len(patient_data[cohort].ID.unique())
            mapping = cdm.loc[feature, cohort]
            if mapping and mapping in patient_data[cohort].columns:
                data = patient_data[cohort].loc[:, ["ID", "Months", mapping]]
                data.dropna(subset=mapping, inplace=True)

                for months in sorted(data.Months.unique().tolist()):
                    patient_count = len(data.loc[data.Months == months].ID.unique())
                    longitudinal_feature.loc[len(longitudinal_feature.index)] = [
                        months,
                        patient_count,
                        total_patient_count,
                        cohort,
                    ]

        longitudinal[feature] = longitudinal_feature

    return longitudinal


# Define the base path
base_path = Path("backend/data")

### READ CDM MODALITIES ###
cdm_files = sorted(base_path.glob("cdm/*.csv"))
modalities = [file.stem for file in cdm_files]
dataframes = [pd.read_csv(file) for file in cdm_files]

# Create a dictionary with all modalities as dataframes
all_features = {modality: df for modality, df in zip(modalities, dataframes)}

# Drop irrelevant columns
for df in all_features.values():
    df.drop(columns=["CURIE", "Definition", "Synonyms"], inplace=True, errors="ignore")

# Combine the modalities into a single dataframe
cdm = pd.concat(all_features.values(), ignore_index=True)

# Replace "No total score." as the test was performed but the total score was not reported
cdm.replace({"No total score.": np.nan}, inplace=True)

# Fill all the NaN cells with 0
cdm.fillna(0, inplace=True)

# Filter out features to be ignored
cdm = cdm.loc[cdm.Rank != 0]
cdm.set_index("Feature", inplace=True)

### READ PATIENT LEVEL DATA ###
patient_level_files = sorted(base_path.glob("patient_level/*.csv"))
cohorts = [file.stem for file in patient_level_files]
datasets = [pd.read_csv(file, low_memory=False) for file in patient_level_files]

# Create a dictionary with all cohorts as dataframes
cohort_studies = {cohort: df for cohort, df in zip(cohorts, datasets)}

# Drop empty columns
for cohort, df in cohort_studies.items():
    cohort_studies[cohort].dropna(axis=1, how="all", inplace=True)

longitudinal_feature_data = extract_longitudinal_features(cdm, cohort_studies)

# Save each feature dataframe as csv file
output_path = base_path / "processed/longitudinal"
output_path.mkdir(exist_ok=True)

for feature in longitudinal_feature_data:
    df = longitudinal_feature_data[feature]
    if not df.empty:
        df.set_index(["Months", "Cohort"], inplace=True)
        feature = feature.replace(" ", "_")
        feature = feature.replace("/", "_")
        df.to_csv(output_path / f"longitudinal_{feature.lower()}.csv")
