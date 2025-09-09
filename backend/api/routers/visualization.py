from typing import Annotated

from fastapi import APIRouter, Depends
from functions.visualization import generate_chords

from api.dependencies import get_client
from api.model import ChordsRequest
from backend.database.postgresql import PostgreSQLRepository

router = APIRouter(prefix="/visualization", tags=["visualization"], dependencies=[Depends(get_client)])


@router.post(
    "/chords/",
    description="Generates links between mappings to visualize with chord diagram.",
)
def get_chords(request: ChordsRequest, database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    modality = request.modality
    cohorts = request.cohorts
    data = generate_chords(modality, cohorts, repo=database)
    return data
