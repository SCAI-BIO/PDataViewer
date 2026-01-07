from typing import Annotated

from database.postgresql import PostgreSQLRepository
from fastapi import APIRouter, Depends

from api.dependencies import get_client
from api.model import LongitudinalData

router = APIRouter(prefix="/longitudinal", tags=["longitudinal"], dependencies=[Depends(get_client)])


@router.get("/", description="Get all available longitudinal tables.")
def get_longitudinal_tables(database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    return database.get_longitudinal_measurement_variables()


@router.get("/{longitudinal}", response_model=list[LongitudinalData], description="Retrieve a longitudinal table.")
def get_longitudinal_table(longitudinal: str, database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    return database.get_longitudinal_measurements(longitudinal)


@router.get("/{longitudinal}/{cohort}", description="Retrieve a longitudinal table.")
def get_longitudinal_table_for_cohort(
    longitudinal: str,
    cohort: str,
    database: Annotated[PostgreSQLRepository, Depends(get_client)],
):
    return database.get_longitudinal_measurements(longitudinal, cohort)
