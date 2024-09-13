import re

from repository.sqllite import SQLLiteRepository
from thefuzz import fuzz, process


def autocomplete(text: str, repo: SQLLiteRepository, threshold=80, limit=10):
    """Gives autocomplete suggestions based on the given query.

    Args:
        text (str): Query given by the user.
        repo (CDMRepository): CDMRepository instance to interact with the database containing the modalities.

    Returns:
        suggestions (list[str]): A list of suggestions.
    """
    # Remove special characters that have syntactic meaning in regex
    text = re.sub(r"[.*+?^${}()|[\]\\]", "", text)
    # Get features and convert them into a list
    features = repo.get_cdm(columns=["Feature"])
    features.replace({"No total score.": ""}, inplace=True)
    features = features["Feature"].to_list()
    # Compile the regex pattern
    pattern = re.compile(r"^" + re.escape(text), re.IGNORECASE)
    # Perform regex pattern matching
    suggestions = [suggestion for suggestion in features if pattern.match(suggestion)]
    # Limit the list of suggestions to a length of 10
    suggestions = suggestions[:10]
    # Sort the list elements in ascending order based in the length
    suggestions.sort(key=lambda s: len(s))

    # If there is no matching prefix
    if not suggestions:
        suggestions = process.extract(
            text, features, scorer=fuzz.partial_token_set_ratio, limit=limit
        )
        suggestions = [
            suggestion[0] for suggestion in suggestions if suggestion[1] >= threshold
        ]

    # If there is less than 10 suggestions
    elif len(suggestions) < 10:
        # Calculate the number of suggestions that will be generated by fuzzy
        limit = limit - len(suggestions)
        # Remove already suggested features from the features list
        suggestions_set = set(suggestions)
        features = [feature for feature in features if feature not in suggestions_set]
        # Generate fuzzy suggestions and populate suggestions list with it
        fuzzy_suggestions = process.extract(
            text, features, scorer=fuzz.partial_token_set_ratio, limit=limit
        )
        # Filter fuzzy suggestions based on the threshold
        fuzzy_suggestions = [
            suggestion[0]
            for suggestion in fuzzy_suggestions
            if suggestion[1] >= threshold
        ]
        # Append fuzzy suggestions to the list of suggestions
        suggestions.extend(fuzzy_suggestions)

    return suggestions
