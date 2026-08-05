from typing import Annotated

from fastapi import APIRouter, Depends

from pdataviewer.api.dependencies import get_cohort_repository
from pdataviewer.api.schemas import CohortMetadata
from pdataviewer.database.repositories.cohorts import CohortRepository

router = APIRouter(prefix="/cohorts", tags=["cohorts"])


@router.get("/", description="Get all cohort names.", response_model=list[str])
async def get_cohort_names(repository: Annotated[CohortRepository, Depends(get_cohort_repository)]) -> list[str]:
    """Return all available cohort names."""
    return await repository.get_names()


@router.get("/metadata", description="Get metadata for all cohorts.", response_model=dict[str, CohortMetadata])
async def get_cohort_metadata(
    repository: Annotated[CohortRepository, Depends(get_cohort_repository)],
) -> dict[str, CohortMetadata]:
    """Return cohort metadata indexed by cohort name."""
    cohorts = await repository.get_all()
    return {cohort.name: CohortMetadata.model_validate(cohort) for cohort in cohorts}
