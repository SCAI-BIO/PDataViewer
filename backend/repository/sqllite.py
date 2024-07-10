import os
from io import BytesIO
from typing import List, Optional

import pandas as pd
from sqlalchemy import Column, Integer, String, create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base


Base = declarative_base()


class Modality(Base):
    __tablename__ = "modality"
    ID = Column(Integer, primary_key=True, autoincrement=True)
    Modality = Column(String(50), unique=True, nullable=False)


class SQLLiteRepository:
    def __init__(
        self,
        db_path: str = "./db/cdm.db",
        data_path: str = "./data",
        initiate_with_data: bool = True,
        replace_if_exists: bool = False,
    ):
        self.db_path = db_path
        if replace_if_exists and os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.engine = create_engine(f"sqlite:///{db_path}")
        Session = sessionmaker(bind=self.engine, autoflush=False)
        self.session = Session()
        if initiate_with_data:
            self.data_path = data_path
            self.__initiate(data_path + "/metadata.csv")
            self.update_cdm_locally(data_path + "/cdm")

    def close(self):
        """
        Close the session.
        """
        self.session.close()
        print("Database closed successfully!")

    def delete_database(self):
        """
        Deletes the database.
        """
        self.close()
        os.remove(self.db_path)
        print(f"Database '{self.db_path}' deleted successfully!")

    def delete_table(self, table_name: str):
        """
        Deletes the specified table.

        Args:
            table_name (str): The name of the table to be dropped.
        """
        with self.engine.connect() as connection:
            try:
                connection.execute(text(f"DROP TABLE IF EXISTS {table_name}"))
                connection.commit()
                print(f"Table '{table_name}' deleted successfully!")
            except Exception as e:
                print(f"Error deleting table: {e}")

    def get_cdm(self, columns: Optional[List[str]] = None) -> pd.DataFrame:
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
        """Get all the table names available in the SQL database.

        Returns:
            list[str]: A list of table names.
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
        """Retrieves table with given table_name from the SQL database and returns a Pandas DataFrame.

        Args:
            table_name (str): The name of the table that will be retrieved.
            columns (None | list[str], optional): Column(s) to read from the table, if None reads all the columns available. Defaults to None.

        Returns:
            pd.DataFrame: Pandas DataFrame instance of the SQL table.
        """
        try:
            if columns:
                # Quote each column name to handle spaces or special characters
                quoted_columns = [f'"{col}"' for col in columns]
                query = f"SELECT {', '.join(quoted_columns)} FROM {table_name}"
            else:
                query = f"SELECT * FROM {table_name}"

            return pd.read_sql(sql=query, con=self.engine)
        except Exception as e:
            print(f"Error retrieving table {table_name}: {e}")
            return pd.DataFrame()

    def store(self, path: str):
        """Adds all available CSV files in the given folder path to the database.

        Args:
            path (str): A path to the folder containing the CSV files.
        """
        for filename in os.listdir(path):
            if filename.endswith(".csv"):
                self.__store_file(os.path.join(path, filename))

    def store_upload(self, content: bytes, table_name: str):
        """Stores a CSV file uploaded via API to the database.

        Args:
            content (bytes): The contents of the uploaded CSV file as bytes.
            table_name (str): The name of the table.
        """
        self.__store_bytes(content, table_name)

    def update_cdm_locally(self, path: str):
        for filename in os.listdir(path):
            if filename.endswith(".csv"):
                table_name = filename[:-4]
                self.__store_file(os.path.join(path, filename))
                self.__add_modality(table_name)

    def update_cdm_upload(self, content: bytes, table_name: str):
        self.__store_bytes(content, table_name)
        self.__add_modality(table_name)

    def __add_modality(self, modality_name: str):
        new_modality = Modality(Modality=modality_name)
        self.session.add(new_modality)
        self.session.commit()

    def __initiate(self, metadata_path: str):
        # Create the modality table
        Base.metadata.create_all(self.engine)
        metadata = pd.read_csv(metadata_path)
        metadata.to_sql("metadata", self.engine, if_exists="replace", index=False)

    def __store_file(self, file_path: str):
        data = pd.read_csv(file_path)
        table_name = os.path.basename(file_path).split(".")[0]
        data.to_sql(table_name, self.engine, if_exists="replace", index=False)

    def __store_bytes(self, content: bytes, table_name: str):
        data = pd.read_csv(BytesIO(content))
        data.to_sql(table_name, self.engine, if_exists="replace", index=False)
