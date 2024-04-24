from typing import Any, Hashable
import pandas as pd
import json

def generate_chords(modality: str, cohorts: list[str]) -> dict[Hashable, Any]:
    """Generate linkage information for cohorts in a modality.

    The variables of each cohort will be encoded in numbers consecutively
    starting from 1. A modality specific decoder can be found in
    datasets/decoder in .json format.

    Args:
        modality (str): Name of the modality
        cohorts (list[str]): Cohorts to be included in the mappings

    Returns:
        chords (dict[str, str | int]): A dictionary containing linkage information
    """    
    # Initialize a dictionary to decode the numbers of variables later on, and save used cohorts
    decoder = {}
    decoder["cohorts"] = cohorts
    # Read the .csv file
    folder_path = "../datasets/cdm"
    mappings = pd.read_csv(f"{folder_path}/{modality}.csv", usecols=cohorts)
    # Filter out rows with only 1 mapping
    mappings = mappings[mappings.notna().sum(axis=1) > 1]
    # Filter out empty columns
    mappings.dropna(how="all", axis=1, inplace=True)
    # Encode DataFrame values to consecutive numbers (starting from 1) for non-NaN values
    for column in mappings.columns:
        number = 1
        for row in mappings.index:
            if pd.notna(mappings.loc[row, column]):
                # If the cohort does not exist in the dictionary,
                # initialize it with an empty dictionary
                if column not in decoder.keys():
                    decoder[column] = {}
                # Save the encoded number of the variable to decoder dictionary
                decoder[column][number] = mappings.loc[row, column]
                mappings.loc[row, column] = number
                number += 1
    # Save the decoder as json
    with open(f"../datasets/decoder/{modality}_decoder.json", "w") as outfile:
        json.dump(decoder, outfile)
    # Create an empty data frame with column names
    chords = pd.DataFrame(columns=["link_id", "cohort", "start", "end"])
    # Populate chords with link_ids
    link_id = 0
    for row in mappings.index:
        for column in mappings.columns:
            value = mappings.loc[row, column]
            if pd.notna(value):
                chords.loc[len(chords.index)] = [f"link_{link_id}", column, value, value]
        link_id += 1
    chords = chords.to_dict()
    return chords