from typing import Annotated

from fastapi import APIRouter, Depends
from repository.sqllite import SQLLiteRepository

from api.dependencies import get_db

router = APIRouter(prefix="/cohorts", tags=["cohorts"], dependencies=[Depends(get_db)])


@router.get("/metadata", description="Get all features of a modality")
def get_metadata(database: Annotated[SQLLiteRepository, Depends(get_db)]):
    metadata = database.retrieve_table("metadata")
    metadata.set_index("cohort", inplace=True)
    return metadata.to_dict(orient="index")
