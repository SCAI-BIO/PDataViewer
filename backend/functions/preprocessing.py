import pandas as pd


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