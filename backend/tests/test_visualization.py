import pandas as pd

from preprocessing.visualization import generate_chords


def test_generate_chords():
    modality = "test_mappings"
    cohorts = ["cohort_x", "cohort_y", "cohort_z"]

    chords, decoder = generate_chords(modality, cohorts, folder="./backend/tests/resources")

    chords_result = {
        "link_id": ["link_0", "link_0", "link_1", "link_1", "link_1", "link_2", "link_2"],
        "cohort": ["cohort_x", "cohort_y", "cohort_x", "cohort_y", "cohort_z", "cohort_x", "cohort_z"],
        "start": [1, 1, 2, 2, 1, 3, 2],
        "end": [1, 1, 2, 2, 1, 3, 2],
    }

    chords_result = pd.DataFrame(chords_result)
    chords_result = chords_result.to_dict()

    decoder_result = {
        "cohorts": ["cohort_x", "cohort_y", "cohort_z"],
        "cohort_x": {1: "age_x", 2: "height_x", 3: "weight_x"},
        "cohort_y": {1: "age_y", 2: "height_y"},
        "cohort_z": {1: "height_z", 2: "weight_z"},
    }

    # Assert the output dictionaries match the expected dictionaries
    assert decoder == decoder_result
    assert chords == chords_result
