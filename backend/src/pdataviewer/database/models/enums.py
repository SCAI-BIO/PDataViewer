import enum


class ConceptSource(enum.Enum):
    """Origin of a concept stored in the database."""

    COHORT = "cohort"
    CDM = "cdm"
