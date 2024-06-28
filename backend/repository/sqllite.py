import os
import pandas as pd
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from repository.base import BaseRepository


class SQLLiteRepository(BaseRepository):
    def __init__(self, path: str):
        self.engine = create_engine(f"sqlite:///{path}")
        Session = sessionmaker(bind=self.engine, autoflush=False)
        self.session = Session()

    def store(self, path: str):      
        for filename in os.listdir(path):
            if filename.endswith(".csv"):
                file_path = os.path.join(path, filename)
                data = pd.read_csv(file_path)
                table_name = filename[:-4]
                data.to_sql(table_name, self.engine, if_exists="replace", index=False)

    def retrieve_table(self, table_name: str, columns: None | list[str] = None):
        if columns:
            data = pd.read_sql(table_name, self.engine, columns=columns)
        else:
            data = pd.read_sql(table_name, self.engine)
        return data

    def get_table_names(self):     
        inspector = inspect(self.engine)
        table_names = inspector.get_table_names()
        return table_names

    def close(self):
        self.session.close()


class CDMRepository(SQLLiteRepository):
    def __init__(self, path: str = "./db/cdm.db"):
        super().__init__(path=path)

    def get_cdm(self) -> pd.DataFrame:
        """Merges all available modality tables in the CDM database into PASSIONATE CDM.

        Returns:
            pd.DataFrame: PASSIONATE CDM that comprises all modalities.
        """        
        table_names = self.get_table_names()
        frames = []
        for table in table_names:
            frames.append(self.retrieve_table(table))

        cdm = pd.concat(frames, ignore_index=True)
        return cdm

    def get_columns(self, columns: list[str]) -> pd.DataFrame:
        """Generates the PASSIONATE CDM with only the specified column(s).

        Args:
            columns (list[str]): A list of columns to include in PASSIONATE CDM.

        Returns:
            pd.DataFrame: PASSIONATE CDM with the selected column(s).
        """        
        table_names = self.get_table_names()
        frames = []
        for table in table_names:
            frames.append(self.retrieve_table(table, columns=columns))

        cdm = pd.concat(frames, ignore_index=True)
        return cdm
