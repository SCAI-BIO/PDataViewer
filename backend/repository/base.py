from abc import ABC, abstractmethod
import pandas as pd

class BaseRepository(ABC):
    @abstractmethod
    def store(self, path):
        """Store CSV files from the specified path into the database."""
        pass

    @abstractmethod
    def retrieve_table(self, table_name, columns=None) -> pd.DataFrame:
        """Retrieve a table with specified columns."""
        pass

    @abstractmethod
    def get_table_names(self) -> list[str]:
        """Get all the table names in the database"""
        pass

    @abstractmethod
    def close():
        """Close the database."""
        pass
