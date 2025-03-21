from typing import Annotated

from fastapi import APIRouter, Depends
from repository.sqllite import SQLLiteRepository

from api.dependencies import get_db

router = APIRouter(
    prefix="/biomarkers", tags=["biomarkers"], dependencies=[Depends(get_db)]
)


@router.get("/")
def get_biomarkers(database: Annotated[SQLLiteRepository, Depends(get_db)]):
    """
    Get all available biomarker tables.
    """
    return database.get_table_names(starts_with="biomarkers_")


@router.get("/{biomarker}")
def get_biomarker(
    biomarker: str, database: Annotated[SQLLiteRepository, Depends(get_db)]
):
    """
    Retrieve a biomarker table.
    """
    table_name = "biomarkers_" + biomarker
    data = database.retrieve_table(table_name=table_name)
    return data.to_dict(orient="records")


@router.get("/{biomarker}/cohorts")
def get_biomarker_cohorts(
    biomarker: str, database: Annotated[SQLLiteRepository, Depends(get_db)]
):
    """
    Retrieve the list of available cohorts for a biomarker table.
    """
    table_name = "biomarkers_" + biomarker
    data = database.retrieve_table(table_name=table_name)
    return list(data.Cohort.unique())


@router.get("/{biomarker}/diagnoses")
def get_cohort_biomarkers(
    biomarker: str, database: Annotated[SQLLiteRepository, Depends(get_db)]
):
    """
    Retrieve the measurements of chosen biomarker for the specified cohort.
    """
    diagnoses = {}
    table_name = "biomarkers_" + biomarker
    data = database.retrieve_table(table_name=table_name)
    for cohort in data.Cohort.unique():
        cohort_data = data.loc[data["Cohort"] == cohort]
        unique_diagnoses = list(cohort_data.Diagnosis.unique())
        if len(unique_diagnoses) > 1:
            unique_diagnoses.append("Complete")
        diagnoses[cohort] = unique_diagnoses
    return diagnoses


@router.get("/{biomarker}/cohorts/{cohort}/diagnoses")
def get_biomarker_diagnosis(
    biomarker: str, cohort: str, database: Annotated[SQLLiteRepository, Depends(get_db)]
):
    """
    Get unique diagnoses from a biomarker table.
    """
    table_name = "biomarkers_" + biomarker
    data = database.retrieve_table(table_name=table_name)
    data = data.loc[data["Cohort"] == cohort]
    return list(data.Diagnosis.unique())


@router.get(
    "/{biomarker}/cohorts/{cohort}/diagnoses/{diagnosis}",
    tags=["biomarkers"],
)
def get_filtered_data(
    biomarker: str,
    cohort: str,
    diagnosis: str,
    database: Annotated[SQLLiteRepository, Depends(get_db)],
):
    """
    Filter biomarker data based on the chosen diagnosis type
    """
    table_name = "biomarkers_" + biomarker
    data = database.retrieve_table(table_name=table_name)
    data = data.loc[data["Cohort"] == cohort]
    if diagnosis != "Complete":
        data = data.loc[data["Diagnosis"] == diagnosis]
    return data.Measurement.to_list()
