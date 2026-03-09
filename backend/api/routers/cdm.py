from typing import Annotated

from database.models import ConceptSource
from database.postgresql import PostgreSQLRepository
from fastapi import APIRouter, Depends

from api.dependencies import get_client

router = APIRouter(prefix="/cdm", tags=["cdm"])


@router.get("/variables", description="Get all variables available in PASSIONATE.")
async def get_variables(database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    concepts = await database.get_concepts(source_type=ConceptSource.CDM)
    return [c.variable for c in concepts]


@router.get("/modalities", description="Get all modalities available in PASSIONATE.")
async def get_modalities(database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    return await database.get_modalities()
