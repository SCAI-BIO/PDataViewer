from typing import Annotated

from fastapi import APIRouter, Depends

from pdataviewer.api.dependencies import get_concept_repository
from pdataviewer.database.models import ConceptSource
from pdataviewer.database.repositories import ConceptRepository

router = APIRouter(prefix="/cdm", tags=["cdm"])


@router.get("/variables", description="Get all variables available in PASSIONATE.", response_model=list[str])
async def get_variables(repository: Annotated[ConceptRepository, Depends(get_concept_repository)]) -> list[str]:
    """Return all CDM variable names."""
    return await repository.get_variable_names(source_type=ConceptSource.CDM)


@router.get("/modalities", description="Get all modalities available in PASSIONATE.", response_model=list[str])
async def get_modalities(repository: Annotated[ConceptRepository, Depends(get_concept_repository)]) -> list[str]:
    """Return all available CDM modalities"""
    return await repository.get_modalities()
