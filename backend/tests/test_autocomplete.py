from functions.autocomplete import autocomplete


def test_autocomplete_matching_prefix():
    query = "ag"
    suggestions = autocomplete(query, path="backend/db/cdm.db")
    result = [
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
    assert len(suggestions) <= 10
    assert suggestions == result


def test_autocomplete_typo():
    query = "agy"
    suggestions = autocomplete(query, path="backend/db/cdm.db")
    result = [
        "Aging-related tau Astrogliopathy (ARTAG) Severity",
        "MDS-UPDRS - Right Leg Agility",
        "MDS-UPDRS - Left Leg Agility",
        "Age",
    ]
    assert len(suggestions) <= 10
    assert suggestions == result


def test_autocomplete_meaningless_query():
    query = "xsdsxa"
    suggestions = autocomplete(query, path="backend/db/cdm.db")
    result = []
    assert suggestions == result


def test_autocomplete_remove_special_characters():
    query1 = "ag\s\s"
    query2 = "agss"
    suggestions1 = autocomplete(query1, path="backend/db/cdm.db")
    suggestions2 = autocomplete(query2, path="backend/db/cdm.db")
    assert suggestions1 == suggestions2
