import pandas as pd

from backend.database.postgresql import PostgreSQLRepository


def generate_chords(
    modality: str, cohorts: list[str], repo: PostgreSQLRepository
) -> dict[str, list[dict[str, str]]]:
    """Generate linkage information for cohorts in a specified modality.

    This function retrieves data related to the specified modality from the SQL database, filters and processes
    it to identify connections (links) between cohorts based on shared mappings, and constructs the data in
    a format suitable for chord diagrams or other network visualizations.

    Args:
        modality (str): The name of the modality, used to identify the relevant table in the database.
        cohorts (list[str]): A list of cohort names to include in the mappings. Only cohorts in this list are processed.
        repo (SQLLiteRepository): An instance of `SQLLiteRepository` used to interact with the database.

    Raises:
        ValueError: If the `cohorts` list is empty.

    Returns:
        dict[str, list[dict[str, str]]]: A dictionary with two keys:
            - 'nodes': A list of dictionaries, where each dictionary represents a node with the following keys:
                - `name` (str): The identifier or name of the node (e.g., mapping or cohort name).
                - `group` (str): The cohort name that the node belongs to.
            - 'links': A list of dictionaries, where each dictionary represents a link with the following keys:
                - `source` (str): The name of the source node.
                - `target` (str): The name of the target node.

        The 'nodes' represent individual mappings or entities, grouped by cohort, while the 'links' define the
        connections between these nodes based on shared mappings across cohorts.
    """
    # Check if the cohorts list is empty
    if not cohorts:
        raise ValueError("The 'cohorts' list cannot be empty.")

    data = {}
    nodes = []
    links = []

    # Get the table
    mappings = repo.retrieve_table(modality, columns=cohorts)
    # Filter out rows with only 1 mapping
    mappings = mappings[mappings.notna().sum(axis=1) > 1]
    # Filter out empty columns
    mappings.dropna(how="all", axis=1, inplace=True)
    # For comma separated multiple mappings, create a new row for each mapping
    for column in mappings.columns:
        if mappings[column].apply(lambda x: isinstance(x, str) and ", " in x).any():
            mappings[column] = mappings[column].str.split(", ")
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
