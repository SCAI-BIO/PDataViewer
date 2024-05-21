from functions.studypicker import rank_cohorts


def test_rank_cohorts():
    features = ["age", "height", "bmi"]
    ranked_cohorts = rank_cohorts(features=features, folder="./backend/tests/resources")

    rank_cohorts_result = {
        "Cohort (ranked)": {0: "cohort_x", 1: "cohort_y", 2: "cohort_z"},
        "Successfully found": {0: "2/3 (66.67%)", 1: "2/3 (66.67%)", 2: "1/3 (33.33%)"},
        "Missing features": {0: "bmi", 1: "bmi", 2: "age, bmi"},
    }

    # Assert the shape of the DataFrame
    assert ranked_cohorts.shape == (3, 3)
    # Assert the column data types
    assert ranked_cohorts["Cohort (ranked)"].dtype == "object"
    assert ranked_cohorts["Successfully found"].dtype == "object"
    assert ranked_cohorts["Missing features"].dtype == "object"
    # Assert the values in the DataFrame
    assert rank_cohorts_result == ranked_cohorts.to_dict()
    # Check if the DataFrame is empty when no cohorts are found
    assert not ranked_cohorts.empty or features == []