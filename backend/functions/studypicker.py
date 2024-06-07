"""
The cohort ranking module provides functionality to rank cohorts based on the availability of requested features.
It includes a function to merge and clean modality data, and then rank cohorts based on the presence of specified features.

The module includes the following function:
- rank_cohorts(features: list[str], folder: str="./cdm") -> pd.DataFrame:
    Ranks cohorts based on the availability of requested features by merging modality data and filtering based on the features list.

Usage example:
---------------
To rank cohorts based on a list of features using the data in the './cdm' folder:

    from functions.studypicker import rank_cohorts

    features = ['Feature1', 'Feature2', 'Feature3']
    ranked_cohorts = rank_cohorts(features=features, folder='./cdm')
    print(ranked_cohorts)

Dependencies:
--------------
- os: For checking the existence of directories and files.
- pandas: For data manipulation and processing.
- numpy: For handling missing data.
- functions.preprocessing: For `merge_modalities` and `clean_extra_columns` functions to obtain and clean feature data.

Exceptions:
-----------
The `rank_cohorts` function raises the following exceptions:
- FileNotFoundError: If the specified folder does not exist or is empty.
- ValueError: If the provided `features` list is empty.
"""

import os

import pandas as pd
import numpy as np

from functions.preprocessing import merge_modalities, clean_extra_columns

def rank_cohorts(features: list[str], folder: str="./cdm") -> pd.DataFrame:
    """Ranks cohorts based on the availability of requested features.

    Args:
        features (list[str]): A list of features user interested in
        folder (str, optional): Path to folder containing modalities. Defaults to "./cdm".
    
    Raises:
        FileNotFoundError: The folder does not exist
        FileNotFoundError: The folder is empty
        ValueError: features list cannot be empty

    Returns:
        ranked_cohorts (pd.DataFrame): A dataframe showcasing ranked cohorts
    """
    # Check if the folder exists
    if not os.path.exists(folder):
        raise FileNotFoundError(f"the folder '{folder}' does not exist.")
    # Check if the folder is empty
    if not bool(os.listdir(folder)):
        raise FileNotFoundError(f"the folder '{folder}' is empty.")
    # Check if the features list is empty
    if not features:
        raise ValueError("The 'features' list cannot be empty")
    total_features = len(features)
    # Initialize an empty data frame
    ranked_cohorts = pd.DataFrame(columns=["cohort", "found", "missing"])
    # Merge the modalities together
    cdm = merge_modalities(folder=folder)
    # Use NaN for missing values
    cdm.replace({"": np.nan}, inplace=True)
    # Set Feature column as the index and drop non-cohort columns
    cdm.set_index("Feature", inplace=True)
    cdm = clean_extra_columns(cdm)
    # Filter the CDM based on requested features
    mappings = cdm.loc[features, :]
    for column in mappings.columns:
        # If the column is empty continue with the next iteration
        if mappings[column].isna().all():
            continue
        # Store found and missing features for each cohort
        found_features = mappings[column].notna().sum()
        missing_features = mappings[mappings[column].isna()].index.tolist()
        # Concatenate missing features with a comma
        missing_features = ", ".join(map(str, missing_features))
        # Add derived information to the ranked_cohorts data frame
        ranked_cohorts.loc[len(ranked_cohorts.index)] = [column, found_features, missing_features]
    # Sort values based on the number of successfully found features
    ranked_cohorts.sort_values(by="found", ascending=False, inplace=True)
    # Reset the indices, otherwise creates an issue in json
    ranked_cohorts.reset_index(drop=True, inplace=True)
    # Calculate the percentage of features found
    percentage_found = ((ranked_cohorts["found"] / total_features) * 100).round(2)
    # Format the "Successfully found" column so that it displays the data in
    # "(found_features)/(total_features) (percentage_found)" format
    ranked_cohorts["found"] = ranked_cohorts["found"].astype(str) + "/" + str(total_features) + " (" + percentage_found.astype(str) + "%)"
    return ranked_cohorts