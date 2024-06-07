"""
The preprocessing module provides functions to merge and clean modality data for the PASSIONATE CDM.
It includes functionalities to merge multiple CSV files into a single DataFrame and to clean unnecessary 
columns from the data.

The module includes the following functions:
- merge_modalities(folder: str="./cdm", usecols: None | list[str] = None) -> pd.DataFrame:
    Merges all CSV files in a specified folder into a single DataFrame, optionally selecting specific columns.
- clean_extra_columns(df: pd.DataFrame, extra_columns: list[str]=["CURIE", "Definition", "Synonyms", "OMOP"]) -> pd.DataFrame:
    Removes specified columns from a given DataFrame.

Usage example:
---------------
To merge all modality CSV files in the './cdm' folder into a single DataFrame and clean it by removing 
extra columns:

    from functions.preprocessing import merge_modalities, clean_extra_columns

    merged_data = merge_modalities(folder='./cdm')
    cleaned_data = clean_extra_columns(merged_data, extra_columns=['CURIE', 'Definition'])

Dependencies:
--------------
- os: For checking the existence of directories and files.
- pandas: For data manipulation and processing.

Exceptions:
-----------
The `merge_modalities` function raises the following exceptions:
- FileNotFoundError: If the specified folder does not exist or is empty.
- ValueError: If the provided `usecols` list is empty.

The `clean_extra_columns` function does not raise any exceptions.
"""

import os
import pandas as pd


def merge_modalities(folder: str="./cdm", usecols: None | list[str] = None) -> pd.DataFrame:
    """Merges all the modalities to create PASSIONATE CDM.

    Args:
        folder (str, optional): Path to folder containing the modalities. Defaults to "./cdm".
        usecols (None | list[str], optional): Columns to use. Defaults to None.

    Raises:
        FileNotFoundError: The folder does not exist
        FileNotFoundError: The folder is empty
        ValueError: usecols list cannot be empty
        
    Returns:
        cdm (pd.DataFrame): PASSIONATE CDM containing all the modalities
    """
    # Check if the folder exists
    if not os.path.exists(folder):
        raise FileNotFoundError(f"the folder '{folder}' does not exist.")
    # Check if the folder is empty
    if not bool(os.listdir(folder)):
        raise FileNotFoundError(f"the folder '{folder}' is empty.")
    # Check if the usecols is not None and not an empty list
    if usecols is not None and not usecols:
        raise ValueError("The 'usecols' list cannot be empty. Please specify columns to use")    
    files = sorted([file for file in os.listdir(folder) if file.endswith(".csv")])
    dfs = [pd.read_csv(os.path.join(folder, file), keep_default_na=False, usecols=usecols) for file in files]
    cdm = pd.concat(dfs, ignore_index=True)
    cdm.replace({"No total score.": ""}, inplace=True)
    return cdm


def clean_extra_columns(df: pd.DataFrame, extra_columns: list[str]=["CURIE", "Definition", "Synonyms", "OMOP"]):
    """Cleans additional information from a given mapping data frame.

    Args:
        df (pd.DataFrame): Mappings data frame
        extra_columns (list[str], optional): List of columns to drop. Defaults to ["CURIE", "Definition", "Synonyms", "OMOP"].

    Returns:
        df (pd.DataFrame): Mappings data cleaned from additional information
    """    
    for column in extra_columns:
        if column in df.columns:
            df.drop(column, axis=1, inplace=True)
    return df