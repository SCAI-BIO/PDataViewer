import pandas as pd
import numpy as np
from repository.sqllite import CDMRepository

def rank_cohorts(features: list[str]) -> pd.DataFrame:
    """Ranks cohorts based on the availability of requested features.

    Args:
        features (list[str]): A list of features user interested in
    
    Raises:
        ValueError: features list cannot be empty

    Returns:
        ranked_cohorts (pd.DataFrame): A dataframe showcasing ranked cohorts
    """
    # Check if the features list is empty
    if not features:
        raise ValueError("The 'features' list cannot be empty")
    
    cdm_repo = CDMRepository()
    total_features = len(features)
    # Initialize an empty data frame
    ranked_cohorts = pd.DataFrame(columns=["cohort", "found", "missing"])
    # Get CDM from the SQL repository
    cdm = cdm_repo.get_cdm()
    # Use NaN for missing values
    cdm.replace({"": np.nan}, inplace=True)
    # Set Feature column as the index and drop non-cohort columns
    cdm.set_index("Feature", inplace=True)
    cdm.drop(["CURIE", "Definition", "Synonyms", "OMOP"], axis=1, inplace=True)
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