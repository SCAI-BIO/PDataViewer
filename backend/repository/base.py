from abc import ABC, abstractmethod

import pandas as pd


class BaseRepository(ABC):
    @abstractmethod
    def store(self, path):
        """Adds all available CSV files in the given folder path to the database.

        Args:
            path (str): A path to the folder containing the CSV files.
        """
        pass

    @abstractmethod
    def retrieve_table(self, table_name, columns=None) -> pd.DataFrame:
        """Retrieves table with given table_name from the SQL database and returns a Pandas DataFrame.

        Args:
            table_name (str): The name of the table that will be retrieved.
            columns (None | list[str], optional): Column(s) to read from the table, if None reads all the columns available. Defaults to None.

        Returns:
            pd.DataFrame: Pandas DataFrame instance of the SQL table.
        """
        pass

    @abstractmethod
    def get_table_names(self) -> list[str]:
        """Get all the table names available in the SQL database.

        Returns:
            list[str]: A list of table names.
        """
        pass

    @abstractmethod
    def delete_database(self):
        """
        Deletes the database.
        """
        pass

    @abstractmethod
    def delete_table(self, table_name):
        """
        Deletes the specified table.

        Args:
            table_name (str): The name of the table to be dropped.
        """

    @abstractmethod
    def close(self):
        """
        Close the session.
        """
        pass
