import os
from pathlib import Path

import pandas as pd
import pytest
from repository.sqllite import SQLLiteRepository


@pytest.fixture
def sqlite_repo(tmp_path: Path):
    db_path = tmp_path / "test.db"
    repo = SQLLiteRepository(str(db_path))
    yield repo
    repo.close()


def test_store_and_retrieve_table(sqlite_repo: SQLLiteRepository, tmp_path: Path):
    # Create a sample CSV file
    data = pd.DataFrame({"col1": [1, 2], "col2": [3, 4]})
    csv_path = tmp_path / "sample.csv"
    data.to_csv(csv_path, index=False)

    # Store the CSV into the database
    sqlite_repo.store(str(tmp_path))

    # Retrieve the table
    retrieved_data = sqlite_repo.retrieve_table("sample")

    pd.testing.assert_frame_equal(data, retrieved_data)


def test_get_table_names(sqlite_repo: SQLLiteRepository, tmp_path: Path):
    # Create a sample CSV file
    data = pd.DataFrame({"col1": [1, 2], "col2": [3, 4]})
    csv_path = tmp_path / "sample.csv"
    data.to_csv(csv_path, index=False)

    # Store the CSV into the database
    sqlite_repo.store(str(tmp_path))

    # Get table names
    table_names = sqlite_repo.get_table_names()

    assert "sample" in table_names


def test_delete_table(sqlite_repo: SQLLiteRepository, tmp_path: Path):
    # Create a sample CSV file
    data = pd.DataFrame({"col1": [1, 2], "col2": [3, 4]})
    csv_path = tmp_path / "sample.csv"
    data.to_csv(csv_path, index=False)

    # Store the CSV into the database
    sqlite_repo.store(str(tmp_path))

    # Delete the table
    sqlite_repo.delete_table("sample")

    # Check that the table is deleted
    table_names = sqlite_repo.get_table_names()
    assert "sample" not in table_names


def test_delete_database(sqlite_repo: SQLLiteRepository, tmp_path: Path):
    # Ensure the database is created by storing a dummy table
    dummy_data = pd.DataFrame({"col1": [1], "col2": [2]})
    dummy_csv_path = tmp_path / "dummy.csv"
    dummy_data.to_csv(dummy_csv_path, index=False)
    sqlite_repo.store(str(tmp_path))

    db_path = sqlite_repo.db_path

    # Delete the database
    sqlite_repo.delete_database()

    # Check that the database file is deleted
    assert not os.path.exists(db_path)


def test_cdm_get_cdm(sqlite_repo: SQLLiteRepository, tmp_path: Path):
    # Create sample CSV files
    data1 = pd.DataFrame({"col1": [1, 2], "col2": [3, 4]})
    csv_path1 = tmp_path / "sample1.csv"
    data1.to_csv(csv_path1, index=False)

    data2 = pd.DataFrame({"col1": [5, 6], "col2": [7, 8]})
    csv_path2 = tmp_path / "sample2.csv"
    data2.to_csv(csv_path2, index=False)

    # Store the CSVs into the database
    sqlite_repo.store(str(tmp_path))

    # Retrieve the combined CDM
    cdm = sqlite_repo.get_cdm()

    expected_data = pd.concat([data1, data2], ignore_index=True)
    pd.testing.assert_frame_equal(expected_data, cdm)
