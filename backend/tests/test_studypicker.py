from unittest.mock import MagicMock

import numpy as np
import pandas as pd
import pytest
from functions.studypicker import rank_cohorts
from repository.sqllite import CDMRepository


@pytest.fixture
def mock_cdm_repository():
    mock_repo = MagicMock(spec=CDMRepository)
    mock_repo.get_cdm.return_value = pd.DataFrame(
        {
            "Feature": ["age", "height", "bmi"],
            "cohort_x": ["age_x", "height_x", np.nan],
            "cohort_y": ["age_y", "height_y", np.nan],
            "cohort_z": [np.nan, "height_z", np.nan],
        }
    )
    return mock_repo


@pytest.mark.parametrize(
    "features, expected_result",
    [
        (
            ["age", "height", "bmi"],
            {
                "cohort": {0: "cohort_x", 1: "cohort_y", 2: "cohort_z"},
                "found": {0: "2/3 (66.67%)", 1: "2/3 (66.67%)", 2: "1/3 (33.33%)"},
                "missing": {0: "bmi", 1: "bmi", 2: "age, bmi"},
            },
        ),
    ],
)
def test_rank_cohorts(
    mock_cdm_repository: MagicMock,
    features: list[str],
    expected_result: dict[str, dict[int, str]],
):
    ranked_cohorts = rank_cohorts(
        features=features, repo=mock_cdm_repository, columns_to_drop=None
    )

    # Assert the shape of the DataFrame
    assert ranked_cohorts.shape == (3, 3)
    # Assert the column data types
    assert ranked_cohorts["cohort"].dtype == "object"
    assert ranked_cohorts["found"].dtype == "object"
    assert ranked_cohorts["missing"].dtype == "object"
    # Assert the values in the DataFrame
    assert expected_result == ranked_cohorts.to_dict()
    # Check if the DataFrame is empty when no cohorts are found
    assert not ranked_cohorts.empty or features == []


def test_rank_cohorts_empty_features(mock_cdm_repository: MagicMock):
    with pytest.raises(ValueError, match="The 'features' list cannot be empty"):
        rank_cohorts(features=[], repo=mock_cdm_repository, columns_to_drop=None)
