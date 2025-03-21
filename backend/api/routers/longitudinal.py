from typing import Annotated

from fastapi import APIRouter, Depends
from repository.sqllite import SQLLiteRepository

from api.dependencies import get_db

router = APIRouter(
    prefix="/longitudinal", tags=["longitudinal"], dependencies=[Depends(get_db)]
)


@router.get("/", description="Get all available longitudinal tables.")
def get_longitudinal_tables(database: Annotated[SQLLiteRepository, Depends(get_db)]):
    return database.get_table_names(starts_with="longitudinal_")


@router.get("/{longitudinal}", description="Retrieve a longitudinal table.")
def get_longitudinal_table(
    longitudinal: str, database: Annotated[SQLLiteRepository, Depends(get_db)]
):
    table_name = "longitudinal_" + longitudinal
    data = database.retrieve_table(table_name=table_name)
    return data.to_dict(orient="records")


@router.get("/{longitudinal}/{cohort}", description="Retrieve a longitudinal table.")
def get_longitudinal_table_for_cohort(
    longitudinal: str,
    cohort: str,
    database: Annotated[SQLLiteRepository, Depends(get_db)],
):
    table_name = "longitudinal_" + longitudinal
    data = database.retrieve_table(table_name=table_name)
    data = data.loc[data.Cohort == cohort]
    return data.to_dict(orient="records")
