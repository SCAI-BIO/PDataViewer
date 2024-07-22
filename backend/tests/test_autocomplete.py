from unittest.mock import MagicMock

import pandas as pd
import pytest
from functions.autocomplete import autocomplete
from repository.sqllite import SQLLiteRepository


@pytest.fixture
def mock_database():
    mock_database = MagicMock(spec=SQLLiteRepository)
    mock_database.get_cdm.return_value = pd.DataFrame(
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
    return mock_database


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
def test_autocomplete(mock_database, query, expected_result):
    suggestions = autocomplete(query, repo=mock_database)
    assert len(suggestions) <= 10
    assert suggestions == expected_result


@pytest.mark.parametrize(
    "query1, query2",
    [
        ("ag\\s\\s", "agss"),
    ],
)
def test_autocomplete_remove_special_characters(mock_database, query1, query2):
    suggestions1 = autocomplete(query1, repo=mock_database)
    suggestions2 = autocomplete(query2, repo=mock_database)
    assert suggestions1 == suggestions2
