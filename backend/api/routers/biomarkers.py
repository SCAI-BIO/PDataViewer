from typing import Annotated

from database.postgresql import PostgreSQLRepository
from fastapi import APIRouter, Depends

from api.dependencies import get_client

router = APIRouter(prefix="/biomarkers", tags=["biomarkers"], dependencies=[Depends(get_client)])


@router.get("/")
def get_biomarkers(database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    """
    Get all available biomarker variables.
    """
    return database.get_biomarker_variables()


@router.get("/cohorts")
def get_biomarker_cohorts(biomarker: str, database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    """
    Retrieve the list of available cohorts for a biomarker table.
    """
    return database.get_cohorts_for_biomarker(biomarker)


@router.get("/diagnoses")
def get_cohort_biomarkers(biomarker: str, database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    """
    Retrieve all unique diagnoses per cohort for the given biomarker.
    If multiple diagnoses exist in a cohort, add "Complete".
    """
    diagnoses = []

    cohorts = database.get_cohorts_for_biomarker(biomarker)
    for cohort in cohorts:
        cohort_diagnoses = database.get_diagnoses_for_biomarker_in_cohort(biomarker, cohort)
        for diagnosis in cohort_diagnoses:
            diagnoses.append(f"{cohort} ({diagnosis} Group)")
        if len(cohort_diagnoses) > 1:
            diagnoses.append(f"{cohort} (Complete)")

    return diagnoses


@router.get("/cohorts/{cohort}/diagnoses/{diagnosis}", tags=["biomarkers"])
def get_filtered_data(
    biomarker: str,
    cohort: str,
    diagnosis: str,
    database: Annotated[PostgreSQLRepository, Depends(get_client)],
):
    """
    Filter biomarker data based on the chosen diagnosis type
    """
    if diagnosis == "Complete":
        biomarker_data = database.get_biomarker_measurements(biomarker, cohort, None)
    else:
        biomarker_data = database.get_biomarker_measurements(biomarker, cohort, diagnosis)
    return [bd.measurement for bd in biomarker_data]
