import numpy as np
import pandas as pd

from backend.database.postgresql import PostgreSQLRepository


def rank_cohorts(
    variables: list[str],
    repo: PostgreSQLRepository,
    columns_to_drop: list[str] | None = [
        "CURIE",
        "Definition",
        "Synonyms",
        "OMOP",
        "UMLS",
        "UK Biobank",
        "Rank",
    ],
) -> pd.DataFrame:
    """Ranks cohorts based on the availability of requested variables.

    Args:
        variables (list[str]): A list of variables that the user is interested in.
        repo (SQLLiteRepository): An instance of `SQLLiteRepository` used to interact with the database containing cohort data.
        columns_to_drop (list[str] | None, optional): A list of columns to exclude from the cohort ranking process.
            Defaults to ["CURIE", "Definition", "Synonyms", "OMOP", "UMLS", "Rank"].

    Raises:
        ValueError: If the `variable` list is empty.

    Returns:
        pd.DataFrame: A DataFrame containing ranked cohorts. The columns include:
            - `cohort`: The name of the cohort.
            - `found`: The number and percentage of requested variables found in the cohort, formatted as
              "(found_variables)/(total_variables) (percentage_found%)".
            - `missing`: A comma-separated list of the requested variables that are missing from the cohort.

        The DataFrame is sorted in descending order based on the number of variables found and has its indices reset.
    """
    # Check if the variables list is empty
    if not variables:
        raise ValueError("The 'variables' list cannot be empty")

    total_variables = len(variables)
    # Initialize an empty data frame
    ranked_cohorts = pd.DataFrame(columns=["cohort", "found", "missing"])
    # Get CDM from the SQL repository
    cdm = repo.get_cdm()
    # Use NaN for missing values
    cdm.replace({"": np.nan}, inplace=True)
    # Set Feature column as the index and drop non-cohort columns
    cdm.set_index("Feature", inplace=True)
    if columns_to_drop:
        cdm.drop(columns_to_drop, axis=1, inplace=True)
    # Filter the CDM based on requested variables
    mappings = cdm.loc[variables, :]
    for column in mappings.columns:
        # If the column is empty continue with the next iteration
        if mappings[column].isna().all():
            continue
        # Store found and missing variables for each cohort
        found_variables = mappings[column].notna().sum()
        missing_variables = mappings[mappings[column].isna()].index.tolist()
        # Concatenate missing variables with a comma
        missing_variables = ", ".join(map(str, missing_variables))
        # Add derived information to the ranked_cohorts data frame
        ranked_cohorts.loc[len(ranked_cohorts.index)] = [
            column,
            found_variables,
            missing_variables,
        ]
    # Sort values based on the number of successfully found variables
    ranked_cohorts.sort_values(by="found", ascending=False, inplace=True)
    # Reset the indices, otherwise creates an issue in json
    ranked_cohorts.reset_index(drop=True, inplace=True)
    # Calculate the percentage of variables found
    percentage_found = ((ranked_cohorts["found"] / total_variables) * 100).round(2)
    # Format the "Successfully found" column so that it displays the data in
    # "(found_variables)/(total_variables) (percentage_found)" format
    ranked_cohorts["found"] = (
        ranked_cohorts["found"].astype(str)
        + "/"
        + str(total_variables)
        + " ("
        + percentage_found.astype(str)
        + "%)"
    )
    return ranked_cohorts
