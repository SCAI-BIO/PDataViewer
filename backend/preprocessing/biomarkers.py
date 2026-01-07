import re
from pathlib import Path

import numpy as np
import pandas as pd


def extract_variables(
    df_dict: dict[str, pd.DataFrame], mapping_df: pd.DataFrame
) -> dict[str, dict[str, list[dict[str, int | float | str]]]]:
    """Generates a nested dictionary containing measurements and diagnoses for mapped variables across cohorts.

    This function process cohort data and variable mappings to extract relevant measurement and diagnoses
    for each variable and cohort. The result is a nested dictionary with the following structure:

    - Outer dictionary keys: Variable names.
    - Inner dictionary keys: Cohort names.
    - Inner list items: Dictionaries containing measurements and diagnoses.

    Args:
        df_dict (dict[str, pd.DataFrame]): A dictionary where keys are cohort names and values are data frames
            containing participant-level data for each cohort.
        mapping_df (pd.DataFrame): A data frame containing mappings of variables to their corresponding cohort terms.

    Returns:
        dict[str, dict[str, list[dict[str, int | float | str]]]]: A nested dictionary structured as follows:
            - Outer dictionary:
                - Keys: Variable names.
                - Values: Inner dictionaries for each cohort.
            - Inner dictionary:
                - Keys: Cohort names.
                - Values: Lists of dictionaries containing:
                    - "measurement" (int | float | str): The measured value for the variable.
                    - "diagnoses" (str): The diagnosis associated with the measurement.
    """

    result_dict = {}

    for variable in mapping_df.Feature:

        # Extract only variable column from PASSIONATE
        variable_row = mapping_df.loc[mapping_df["Feature"] == variable]

        for cohort in mapping_df.columns.intersection(list(df_dict.keys())):
            feat = variable_row[cohort].item()

            # If the mapping is empty continue
            if pd.isna(feat):
                continue

            # If the variable mapped to more than one term, take the first one
            if ", " in feat:
                feat = feat.split(", ")[0]

            # The mapped variable might not contain valid measurements
            # In this case drop the column
            if feat not in df_dict[cohort].columns:
                continue

            # Filter rows where both the Measurement and the Diagnosis contain valid information.
            valid_rows = df_dict[cohort][(df_dict[cohort][feat].notna()) & (df_dict[cohort]["Diagnosis"].notna())]

            if not valid_rows.empty:
                if variable not in result_dict:
                    result_dict[variable] = {}
                if cohort not in result_dict[variable]:
                    result_dict[variable][cohort] = []

                for _, row in valid_rows.iterrows():
                    result_dict[variable][cohort].append(
                        {
                            "measurement": row[feat],
                            "diagnosis": row["Diagnosis"],
                        }
                    )

    return result_dict


# Define the base path
base_path = Path("backend/data")

### READ CDM MODALITIES ###
cdm_files = sorted(base_path.glob("cdm/*.csv"))
modalities = [file.stem for file in cdm_files]  # names of the data frames
dataframes = [pd.read_csv(file) for file in cdm_files]  # the data frames

# Create a dictionary with all modalities as dataframes
all_variables = {modality.lower(): df for modality, df in zip(modalities, dataframes)}

# Drop irrelevant columns
for df in all_variables.values():
    df.drop(columns=["CURIE", "Definition", "Synonyms"], inplace=True, errors="ignore")

# Combine the modalities into a single dataframe
merged_df = pd.concat(all_variables.values(), ignore_index=True)

# Replace "No total score." as the test was performed but the total score was not reported
merged_df.replace({"No total score.": np.nan}, inplace=True)

# Filter numeric variables
numeric_variables = merged_df.loc[merged_df.Rank == 2]

### READ PATIENT LEVEL DATA ###
patient_level_files = sorted(base_path.glob("patient_level/*.csv"))
cohorts = [file.stem for file in patient_level_files]  # names of the cohorts
datasets = [pd.read_csv(file, index_col=0, low_memory=False) for file in patient_level_files]  # the actual dataframes
# Create a dictionary with all cohorts as dataframes
cohort_studies = {
    cohort: df.loc[(df["Months"] == 0)] for cohort, df in zip(cohorts, datasets)  # Only utilizing baseline visit
}

# Drop empty columns from the dataframes
for cohort, _ in cohort_studies.items():
    # Please make the patient ID column naming consistent
    # and set it as the index
    cohort_studies[cohort].dropna(axis=1, how="all", inplace=True)

result = extract_variables(cohort_studies, numeric_variables)

# Convert each variable dictionary into a dataframe and save it as csv file
output_path = base_path / "processed/biomarker"
output_path.mkdir(parents=True, exist_ok=True)

for variable, variable_data in result.items():

    # Create a list to store the data
    data = []
    for cohort, measurements in variable_data.items():
        for i, measurement in enumerate(measurements):
            data.append(
                {
                    "participantNumber": i,
                    "cohort": cohort,
                    "measurement": measurement["measurement"],
                    "diagnosis": measurement["diagnosis"],
                }
            )

    # Create the DataFrame
    df = pd.DataFrame(data)

    # Check if DataFrame is empty before saving
    if not df.empty:
        variable = re.sub(r'[\\/*?:"<>|]', "-", variable)
        df = df.sample(frac=1)
        df.set_index(["participantNumber", "cohort"], inplace=True)
        df.to_csv(output_path / f"{variable}.csv")
