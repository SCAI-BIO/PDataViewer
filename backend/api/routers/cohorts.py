from typing import Annotated

from fastapi import APIRouter, Depends

from api.dependencies import get_client
from backend.database.postgresql import PostgreSQLRepository

router = APIRouter(prefix="/cohorts", tags=["cohorts"], dependencies=[Depends(get_client)])


@router.get("/", description="Get all cohort names")
def get_cohorts(database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    cohorts = database.get_cohorts()
    return [cohort.name for cohort in cohorts]


@router.get("/metadata", description="Get cohort metadata")
def get_metadata(database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    return database.get_cohorts()
