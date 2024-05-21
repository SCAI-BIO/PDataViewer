from functions.preprocessing import merge_modalities, clean_extra_columns

def test_merge_modalities():
    folder="./backend/tests/resources/modalities"
    usecols = ["Feature", "cohort_x", "cohort_d", "Synonyms"]
    cdm = merge_modalities(folder=folder, usecols=usecols)

    cdm_result = {
        "Feature": {0: "age", 1: "height", 2: "sex", 3: "mmse", 4: "gds_sf", 5: "apoe"},
        "cohort_x": {0: "age_onset", 1: "", 2: "biological_sex", 3: "mmse_total", 4: "", 5: ""},
        "cohort_d": {0: "Age", 1: "Height", 2: "Sex", 3: "MMSE", 4: "GDS_SF", 5: ""},
        "Synonyms": {0: "Age", 1: "Height", 2: "Biological Sex", 3: "MMSE", 4: "GDS_SF", 5: "APOE"}
    }

    # Assert the shape of the DataFrame
    assert cdm.shape == (6, 4)
    # Assert the column names
    assert cdm.columns.tolist() == ["Feature", "cohort_x", "cohort_d", "Synonyms"]
    # Assert the values in the DataFrame
    assert cdm_result == cdm.to_dict()

def test_clean_extra_columns():
    folder="./backend/tests/resources/modalities"
    usecols = ["Feature", "cohort_x", "cohort_d", "Synonyms"]
    cdm = merge_modalities(folder=folder, usecols=usecols)
    cdm = clean_extra_columns(cdm, extra_columns=["Feature", "Synonyms"])

    cdm_result = {
        "cohort_x": {0: "age_onset", 1: "", 2: "biological_sex", 3: "mmse_total", 4: "", 5: ""},
        "cohort_d": {0: "Age", 1: "Height", 2: "Sex", 3: "MMSE", 4: "GDS_SF", 5: ""},
    }

    # Assert the shape of the DataFrame
    assert cdm.shape == (6, 2)
    # Assert the column names
    assert cdm.columns.tolist() == ["cohort_x", "cohort_d"]
    # Assert the values in the DataFrame
    assert cdm_result == cdm.to_dict()