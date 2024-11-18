from pathlib import Path

import numpy as np
import pandas as pd


def extract_longitudinal_variables(
    cdm: pd.DataFrame, participant_data: dict[str, pd.DataFrame]
) -> dict[str, pd.DataFrame]:
    """Extracts longitudinal participant counts for each variable across cohorts.

    This function process participant-level data and a CDM (Common Data Model) to compute the number of participants
    recorded for a specific variable at each visit across different cohorts. It returns a dictionary where keys
    are variable names and values are data frames containing the longitudinal participant records.

    Args:
        cdm (pd.DataFrame): A data frame representing the PASSIONATE CDM. Each row corresponds to a variable,
            and columns correspond to cohort mappings.
        participant_data (dict[str, pd.DataFrame]): A dictionary containing participant-level data for each cohort.
            - Keys: Cohort names.
            - Values: Data frames of participant data, which must include columns "ID" (participant identifier) and
                "Months".

    Returns:
        dict[str, pd.DataFrame]: A dictionary where:
            - Keys are variable names as specified in the CDM.
            - Values are data frames with the following columns:
                - "Months": The time point of the visit (in months).
                - "PatientCount": Number of participants recorded for the variable at that time point.
                - "TotalPatientCount": Total number of participants in the cohort.
                - "Cohort": The name of the cohort.

    Example:
        {
            "VariableA": pd.DataFrame({
                "Months": [0, 6, 12],
                "PatientCount": [100, 90, 80],
                "TotalPatientCount": [120, 120, 120],
                "Cohort": ["Cohort1", "Cohort1", "Cohort1"]
            }),
            "VariableB": ...
        }
    """
    longitudinal: dict[str, pd.DataFrame] = {}
    for variable in cdm.index:
        longitudinal_variable: pd.DataFrame = pd.DataFrame(
            columns=["Months", "PatientCount", "TotalPatientCount", "Cohort"]
        )
        for cohort in participant_data:
            total_participant_count = len(participant_data[cohort].ID.unique())
            mapping = cdm.loc[variable, cohort]
            if mapping and mapping in participant_data[cohort].columns:
                data = participant_data[cohort].loc[:, ["ID", "Months", mapping]]
                data.dropna(subset=mapping, inplace=True)

                for months in sorted(data.Months.unique().tolist()):
                    participant_count = len(data.loc[data.Months == months].ID.unique())
                    longitudinal_variable.loc[len(longitudinal_variable.index)] = [
                        months,
                        participant_count,
                        total_participant_count,
                        cohort,
                    ]

        longitudinal[variable] = longitudinal_variable

    return longitudinal


# Define the base path
base_path = Path("backend/data")

### READ CDM MODALITIES ###
cdm_files = sorted(base_path.glob("cdm/*.csv"))
modalities = [file.stem for file in cdm_files]
dataframes = [pd.read_csv(file) for file in cdm_files]

# Create a dictionary with all modalities as dataframes
all_variables = {modality: df for modality, df in zip(modalities, dataframes)}

# Drop irrelevant columns
for df in all_variables.values():
    df.drop(columns=["CURIE", "Definition", "Synonyms"], inplace=True, errors="ignore")

# Combine the modalities into a single dataframe
cdm = pd.concat(all_variables.values(), ignore_index=True)

# Replace "No total score." as the test was performed but the total score was not reported
cdm.replace({"No total score.": np.nan}, inplace=True)

# Fill all the NaN cells with 0
cdm.fillna(0, inplace=True)

# Filter out variables to be ignored
cdm = cdm.loc[cdm.Rank != 0]
cdm.set_index("Feature", inplace=True)

### READ PARTICIPANT-LEVEL DATA ###
participant_level_files = sorted(base_path.glob("patient_level/*.csv"))
cohorts = [file.stem for file in participant_level_files]
datasets = [pd.read_csv(file, low_memory=False) for file in participant_level_files]

# Create a dictionary with all cohorts as dataframes
cohort_studies = {cohort: df for cohort, df in zip(cohorts, datasets)}

# Drop empty columns
for cohort, df in cohort_studies.items():
    cohort_studies[cohort].dropna(axis=1, how="all", inplace=True)

longitudinal_variable_data = extract_longitudinal_variables(cdm, cohort_studies)

# Save each variable dataframe as csv file
output_path = base_path / "processed/longitudinal"
output_path.mkdir(exist_ok=True)

for variable in longitudinal_variable_data:
    df = longitudinal_variable_data[variable]
    if not df.empty:
        df.set_index(["Months", "Cohort"], inplace=True)
        variable = variable.replace(" ", "_")
        variable = variable.replace("/", "_")
        df.to_csv(output_path / f"longitudinal_{variable.lower()}.csv")
