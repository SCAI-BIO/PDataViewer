from io import BytesIO
from typing import List, Optional

import pandas as pd
from sqlalchemy import (Column, Integer, MetaData, String, Table,
                        create_engine, inspect)
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()


class Modality(Base):
    __tablename__ = "modality"
    ID = Column(Integer, primary_key=True, autoincrement=True)
    Modality = Column(String(50), unique=True, nullable=False)


class SQLLiteRepository:
    def __init__(self):
        self.engine = create_engine("sqlite:///database.db")
        self.db_path = "database.db"
        Session = sessionmaker(bind=self.engine, autoflush=False)
        self.session = Session()

        # Create empty modality table
        Base.metadata.create_all(self.engine)

    def delete_database(self):
        """
        Deletes all tables in the database and re-creates the modality table.

        This method drops all tables in the database, including the modality table,
        and then re-creates the modality table.

        Raises:
            Exception: If an error occurs while deleting the database.
        """
        try:
            metadata = MetaData()
            metadata.reflect(bind=self.engine)

            with self.engine.connect() as connection:
                for table in reversed(metadata.sorted_tables):
                    print(f"Dropping table '{table.name}' ...")
                    table.drop(connection)

                connection.commit()
                print("All tables deleted successfully!")

            # Create modality table back as is required
            Base.metadata.create_all(self.engine)
        except Exception as e:
            print(f"Error deleting tables: {e}")

    def delete_table(self, table_name: str):
        """
        Deletes a specified table from the database.

        Args:
            table_name (str): The name of the table to be deleted.

        Raises:
            ValueError: If the specified table name does not exist in the database.
            Exception: If an error occurs while deleting the table.
        """
        allowed_tables = self.get_table_names()

        if table_name in allowed_tables:
            try:
                metadata = MetaData()
                metadata.reflect(bind=self.engine)
                table = Table(table_name, metadata, autoload_with=self.engine)

                with self.engine.connect() as connection:
                    table.drop(connection)
            except Exception as e:
                print(f"Error deleting table: {e}")
        else:
            raise ValueError("Invalid table name")

    def get_cdm(self, columns: Optional[List[str]] = None) -> pd.DataFrame:
        """Retrieves the Common Data Model (CDM) from the database, which combines data from all modalities.

        This method queries all modality tables and combines their data into a single DataFrame.

        Args:
            columns (Optional[List[str]], optional): List of columns to retrieve from the modality tables.
                If None, all columns will be retrieved. Defaults to None.

        Returns:
            pd.DataFrame: A DataFrame containing data from all modalities. An empty DataFrame is returned if no data is found.
        """
        modalities = pd.read_sql(sql="SELECT Modality FROM modality", con=self.engine)[
            "Modality"
        ]
        data_frames = []

        # Read all modality tables into a list of DataFrames
        for modality in modalities:
            try:
                if columns:
                    columns_str = ", ".join(columns)
                    query = f"SELECT {columns_str} FROM {modality}"
                else:
                    query = f"SELECT * FROM {modality}"

                df = pd.read_sql(sql=query, con=self.engine)
                data_frames.append(df)
            except Exception as e:
                print(f"Error reading table {modality}: {e}")

        if data_frames:
            cdm = pd.concat(data_frames, ignore_index=True)
        else:
            cdm = pd.DataFrame()

        return cdm

    def get_table_names(self, starts_with: Optional[str] = None) -> List[str]:
        """Retrieves the names of all tables available in the SQL database.

        Args:
            starts_with (Optional[str]): A prefix to filter tables names by. If None, all tables are returned. Defaults to None.

        Returns:
            list[str]: A list of table names in the database, optionally filtered by the provided prefix.
        """
        inspector = inspect(self.engine)
        table_names = inspector.get_table_names()
        if starts_with:
            filtered_table_names = [
                name for name in table_names if name.startswith(starts_with)
            ]
            return filtered_table_names

        return table_names

    def retrieve_table(
        self, table_name: str, columns: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """Retrieves a specified table from the SQL database and returns it as a Pandas DataFrame.

        This method executes a SQL query to retrieve all or specific columns from a given table.

        Args:
            table_name (str): The name of the table to retrieve.
            columns (Optional[List[str]]): A list of columns to retrieve from the table.
                If None, all columns will be retrieved. Defaults to None.

        Returns:
            pd.DataFrame: A DataFrame containing the data from the specified table.
                If an error occurs, an empty DataFrame is returned.
        """
        try:
            # Quote table name to handle spaces or special characters
            quoted_table_name = f'"{table_name}"'
            if columns:
                # Quote each column name to handle spaces or special characters
                quoted_columns = [f'"{col}"' for col in columns]
                columns_str = ", ".join(quoted_columns)
            else:
                columns_str = "*"
            query = f"SELECT {columns_str} FROM {quoted_table_name}"

            return pd.read_sql(sql=query, con=self.engine)
        except Exception as e:
            print(f"Error retrieving table {table_name}: {e}")
            return pd.DataFrame()

    def store_upload(self, content: bytes, table_name: str):
        """Stores a CSV file (uploaded as bytes) into the specified table in the database.

        Args:
            content (bytes): The contents of the uploaded CSV file, represented as bytes.
            table_name (str): The name of the table where the data will be stored.
        """
        self.__store_bytes(content, table_name)

    def update_cdm_upload(self, content: bytes, table_name: str):
        """Updates the CDM table with the contents of the uploaded CSV file.

        This method stores the uploaded CSV file into the corresponding table in the database
        and updates the modality table to include the new modality.

        Args:
            content (bytes): The CSV file content as bytes.
            table_name (str): The name of the table where the data will be stored.

        Raises:
            Exception: If there is an issue while updating the database or modality table.
        """
        self.__store_bytes(content, table_name)
        self.__add_modality(table_name)

    def __add_modality(self, modality_name: str):
        """Adds the specified modality name to the modality table.

        This method adds a new entry to the modality table for the given modality.

        Args:
            modality_name (str): The name of the modality to be added.
        """
        new_modality = Modality(Modality=modality_name)
        self.session.add(new_modality)
        self.session.commit()

    def __store_bytes(self, content: bytes, table_name: str):
        """Stores data (in CSV format) from a byte string into the specified table in the database.

        This method reads the content (as bytes), converts it into a DataFrame, and stores it in the specified table.

        Args:
            content (bytes): The CSV content as bytes.
            table_name (str): The name of the table to store the data in.

        Raises:
            Exception: If there is an error while storing the data in the database.
        """
        data = pd.read_csv(BytesIO(content))
        data.to_sql(table_name, self.engine, if_exists="replace", index=False)
