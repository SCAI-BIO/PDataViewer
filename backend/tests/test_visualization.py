from unittest.mock import patch

import pandas as pd
import pytest
from functions.visualization import generate_chords


@pytest.fixture
def mock_cdm_repository():
    with patch("functions.visualization.CDMRepository") as MockRepo:
        mock_repo = MockRepo.return_value
        mock_repo.retrieve_table.return_value = pd.DataFrame(
            {
                "cohort_x": ["age_x", "height_x", "weight_x"],
                "cohort_y": ["age_y", "height_y", None],
                "cohort_z": [None, "height_z", "weight_z"],
            },
            index=["age", "height", "weight"],
        )
        yield mock_repo


def test_generate_chords(mock_cdm_repository):
    modality = "test_mappings"
    cohorts = ["cohort_x", "cohort_y", "cohort_z"]

    result = generate_chords(modality, cohorts, repo=mock_cdm_repository)

    expected_result = {
        "nodes": [
            {"name": "age_x", "group": "cohort_x"},
            {"name": "age_y", "group": "cohort_y"},
            {"name": "height_x", "group": "cohort_x"},
            {"name": "height_y", "group": "cohort_y"},
            {"name": "height_z", "group": "cohort_z"},
            {"name": "weight_x", "group": "cohort_x"},
            {"name": "weight_z", "group": "cohort_z"},
        ],
        "links": [
            {"source": "age_x", "target": "age_y"},
            {"source": "height_x", "target": "height_y"},
            {"source": "height_x", "target": "height_z"},
            {"source": "height_y", "target": "height_z"},
            {"source": "weight_x", "target": "weight_z"},
        ],
    }

    # Convert the result to a format that is easier to compare
    result_nodes = (
        pd.DataFrame(result["nodes"])
        .sort_values(by=["name", "group"])
        .reset_index(drop=True)
    )
    result_links = (
        pd.DataFrame(result["links"])
        .sort_values(by=["source", "target"])
        .reset_index(drop=True)
    )
    expected_nodes = (
        pd.DataFrame(expected_result["nodes"])
        .sort_values(by=["name", "group"])
        .reset_index(drop=True)
    )
    expected_links = (
        pd.DataFrame(expected_result["links"])
        .sort_values(by=["source", "target"])
        .reset_index(drop=True)
    )

    # Assert the nodes and links match the expected result
    pd.testing.assert_frame_equal(result_nodes, expected_nodes)
    pd.testing.assert_frame_equal(result_links, expected_links)


def test_generate_chords_empty_cohorts(mock_cdm_repository):
    modality = "test_mappings"
    cohorts = []

    with pytest.raises(ValueError, match="The 'cohorts' list cannot be empty."):
        generate_chords(modality, cohorts, repo=mock_cdm_repository)
