from typing import Annotated

from fastapi import APIRouter, Depends
from functions.visualization import generate_chords
from repository.sqllite import SQLLiteRepository

from api.dependencies import get_db
from api.model import ChordsRequest

router = APIRouter(
    prefix="/visualization", tags=["visualization"], dependencies=[Depends(get_db)]
)


@router.post(
    "/chords/",
    description="Generates links between mappings to visualize with chord diagram.",
)
def get_chords(
    request: ChordsRequest, database: Annotated[SQLLiteRepository, Depends(get_db)]
):
    modality = request.modality
    cohorts = request.cohorts
    data = generate_chords(modality, cohorts, repo=database)
    return data
