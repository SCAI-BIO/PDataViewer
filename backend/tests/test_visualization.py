import pandas as pd
from functions.visualization import generate_chords


def test_generate_chords():
    modality = "test_mappings"
    cohorts = ["cohort_x", "cohort_y", "cohort_z"]

    result = generate_chords(modality, cohorts, folder=".backend/tests/resources")

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
        ]
    }

    print(result)
    # Convert the result to a format that is easier to compare
    result_nodes = pd.DataFrame(result["nodes"]).sort_values(by=["name", "group"]).reset_index(drop=True)
    result_links = pd.DataFrame(result["links"]).sort_values(by=["source", "target"]).reset_index(drop=True)
    expected_nodes = pd.DataFrame(expected_result["nodes"]).sort_values(by=["name", "group"]).reset_index(drop=True)
    expected_links = pd.DataFrame(expected_result["links"]).sort_values(by=["source", "target"]).reset_index(drop=True)

    # Assert the nodes and links match the expected result
    pd.testing.assert_frame_equal(result_nodes, expected_nodes)
    pd.testing.assert_frame_equal(result_links, expected_links)
