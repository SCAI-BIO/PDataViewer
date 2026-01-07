from typing import Annotated

from database.models import ConceptSource
from database.postgresql import PostgreSQLRepository
from fastapi import APIRouter, Depends

from api.dependencies import get_client

router = APIRouter(prefix="/cdm", tags=["cdm"], dependencies=[Depends(get_client)])


@router.get("/variables", description="Get all variables available in PASSIONATE.")
def get_variables(database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    concepts = database.get_concepts(source_type=ConceptSource.CDM)
    return [c.variable for c in concepts]


@router.get("/modalities", description="Get all modalities available in PASSIONATE.")
def get_modalities(database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    return database.get_modalities()
