from io import BytesIO
from typing import List, Optional

import pandas as pd
from sqlalchemy import Column, Integer, MetaData, String, Table, create_engine, inspect
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
        Delete all tables in the database.
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
        Deletes the specified table.

        Args:
            table_name (str): The name of the table to be dropped.
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
        """Stores a CSV file uploaded via API to the database.

        Args:
            content (bytes): The contents of the uploaded CSV file as bytes.
            table_name (str): The name of the table.
        """
        self.__store_bytes(content, table_name)

    def update_cdm_upload(self, content: bytes, table_name: str):
        """Updates common data model (CDM) table from the uploaded file.

        Args:
            content (bytes): File to be uploaded converted into bytes.
            table_name (str): Table name to be stored in the SQL database.
        """
        self.__store_bytes(content, table_name)
        self.__add_modality(table_name)

    def __add_modality(self, modality_name: str):
        """Updates the modality table with the name of the uploaded CDM modality.

        Args:
            modality_name (str): Name of the modality to be added.
        """
        new_modality = Modality(Modality=modality_name)
        self.session.add(new_modality)
        self.session.commit()

    def __store_bytes(self, content: bytes, table_name: str):
        """Adds data stored as bytes to the SQL database.

        Args:
            content (bytes): Data stored as bytes.
            table_name (str): Table name to be stored in the SQL database.
        """
        data = pd.read_csv(BytesIO(content))
        data.to_sql(table_name, self.engine, if_exists="replace", index=False)
