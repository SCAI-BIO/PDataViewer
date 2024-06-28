from unittest.mock import MagicMock

import pandas as pd
import pytest
from functions.autocomplete import autocomplete


@pytest.fixture
def mock_cdm_repository():
    mock_repo = MagicMock()
    mock_repo.get_columns.return_value = pd.DataFrame(
        {
            "Feature": [
                "Age",
                "Aging-related tau Astrogliopathy (ARTAG) Severity",
                "Diagnosis",
                "IDEA - Leader of the Village",
                "The National Institute on Aging in collaboration with the Alzheimer's Association (NIA-AA) A Score",
                "The National Institute on Aging in collaboration with the Alzheimer's Association (NIA-AA) B Score",
                "The National Institute on Aging in collaboration with the Alzheimer's Association (NIA-AA) C Score",
                "MDS-UPDRS - Right Leg Agility",
                "MDS-UPDRS - Left Leg Agility",
                "MDS-UPDRS - Hoehn and Yahr Stage",
            ]
        }
    )
    return mock_repo


@pytest.mark.parametrize(
    "query, expected_result",
    [
        (
            "ag",
            [
                "Age",
                "Aging-related tau Astrogliopathy (ARTAG) Severity",
                "Diagnosis",
                "IDEA - Leader of the Village",
                "The National Institute on Aging in collaboration with the Alzheimer's Association (NIA-AA) A Score",
                "The National Institute on Aging in collaboration with the Alzheimer's Association (NIA-AA) B Score",
                "The National Institute on Aging in collaboration with the Alzheimer's Association (NIA-AA) C Score",
                "MDS-UPDRS - Right Leg Agility",
                "MDS-UPDRS - Left Leg Agility",
                "MDS-UPDRS - Hoehn and Yahr Stage",
            ],
        ),
        (
            "agy",
            [
                "Age",
                "Aging-related tau Astrogliopathy (ARTAG) Severity",
                "MDS-UPDRS - Right Leg Agility",
                "MDS-UPDRS - Left Leg Agility",
            ],
        ),
        ("xsdsxa", []),
    ],
)
def test_autocomplete(mock_cdm_repository, query, expected_result):
    suggestions = autocomplete(query, repo=mock_cdm_repository)
    assert len(suggestions) <= 10
    assert suggestions == expected_result


@pytest.mark.parametrize(
    "query1, query2",
    [
        ("ag\\s\\s", "agss"),
    ],
)
def test_autocomplete_remove_special_characters(mock_cdm_repository, query1, query2):
    suggestions1 = autocomplete(query1, repo=mock_cdm_repository)
    suggestions2 = autocomplete(query2, repo=mock_cdm_repository)
    assert suggestions1 == suggestions2
