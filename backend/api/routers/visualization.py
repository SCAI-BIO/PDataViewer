from typing import Annotated

from database.postgresql import PostgreSQLRepository
from fastapi import APIRouter, Depends

from api.dependencies import get_client

router = APIRouter(prefix="/visualization", tags=["visualization"], dependencies=[Depends(get_client)])


@router.post(
    "/chords/",
    description="Generates links between mappings to visualize with chord diagram.",
)
def get_chords(modality: str, database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    return database.get_chord_diagram(modality)
