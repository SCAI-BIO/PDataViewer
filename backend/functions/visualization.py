import os
import pandas as pd


def generate_chords(modality: str, cohorts: list[str], folder: str='./cdm'):
    """Generate linkage information for cohorts in a specified modality.

    This function reads a CSV file corresponding to the given modality from the specified folder,
    processes the data to filter out rows and columns based on the presence of mappings,
    and constructs linkage information in the form of nodes and links between the cohorts.

    Args:
        modality (str): Name of the modality, used to identify the CSV file in the folder.
        cohorts (list[str]): List of cohort names to be included in the mappings.
        folder (str, optional): Path to the folder containing the modality CSV file. Defaults to './cdm'.

    Raises:
        FileNotFoundError: If the specified folder does not exist.
        FileNotFoundError: If the specified folder is empty.
        ValueError: If the cohorts list is empty

    Returns:
        dict: A dictionary containing:
            - 'nodes': A list of dictionaries, each representing a node with 'name' and 'group'.
            - 'links': A list of dictionaries, each representing a link with 'source' and 'target'.
    """
    # Check if the folder exists
    if not os.path.exists(folder):
        raise FileNotFoundError(f"the folder '{folder}' does not exist.")
    # Check if the folder is empty
    if not bool(os.listdir(folder)):
        raise FileNotFoundError(f"the folder '{folder}' is empty.")
    # Check if the cohorts list is empty
    if not cohorts:
        raise ValueError("The 'cohorts' list cannot be empty.")
    
    data = {}
    nodes = []
    links = []

    # Read the .csv file
    mappings = pd.read_csv(f"{folder}/{modality}.csv", usecols=cohorts)
    # Filter out rows with only 1 mapping
    mappings = mappings[mappings.notna().sum(axis=1) > 1]
    # Filter out empty columns
    mappings.dropna(how="all", axis=1, inplace=True)
    # For comma separated multiple mappings, create a new row for each mapping
    for column in mappings.columns:
        if mappings[column].apply(lambda x: isinstance(x, str) and ', ' in x).any():
            mappings[column] = mappings[column].str.split(', ')
            mappings = mappings.explode(column)
    filtered_cohorts = mappings.columns

    for _, row in mappings.iterrows():
        for i in range(len(filtered_cohorts)):
            source = row[filtered_cohorts[i]]
            for j in range(i + 1, len(filtered_cohorts)):
                target = row[filtered_cohorts[j]]
                if pd.notna(target) and pd.notna(source):
                    if {"name": source, "group": filtered_cohorts[i]} not in nodes:
                        nodes.append({"name": source, "group": filtered_cohorts[i]})
                    if {"name": target, "group": filtered_cohorts[j]} not in nodes:
                        nodes.append({"name": target, "group": filtered_cohorts[j]})
                    links.append({"source": source, "target": target})

    data["links"] = links
    data["nodes"] = list(nodes)
    return data