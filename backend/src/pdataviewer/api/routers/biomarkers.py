from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from pdataviewer.api.dependencies import get_biomarker_service
from pdataviewer.api.dependencies.database import get_biomarker_repository
from pdataviewer.api.services import BiomarkerService
from pdataviewer.database.repositories.biomarkers import BiomarkerRepository

router = APIRouter(prefix="/biomarkers", tags=["biomarkers"])


@router.get("/", description="Get all available biomarker variables.", response_model=list[str])
async def get_biomarkers(service: Annotated[BiomarkerRepository, Depends(get_biomarker_repository)]) -> list[str]:
    """Return all available biomarker variables."""
    return await service.get_variables()


@router.get("/cohorts", description="Get all cohorts containing a biomarker.", response_model=list[str])
async def get_biomarker_cohorts(
    biomarker: Annotated[str, Query(min_length=1, description="Biomarker variable name")],
    service: Annotated[BiomarkerRepository, Depends(get_biomarker_repository)],
) -> list[str]:
    """Return cohorts containing the requested biomarker."""
    return await service.get_cohorts_for_variable(biomarker)


@router.get(
    "/diagnoses",
    description="Get all cohort and diagnosis combinations available for a biomarker.",
    response_model=list[str],
)
async def get_biomarker_diagnoses(
    biomarker: Annotated[str, Query(min_length=1, description="Biomarker variable name.")],
    service: Annotated[BiomarkerService, Depends(get_biomarker_service)],
) -> list[str]:
    """Return selectable diagnosis groups for a biomarker."""
    return await service.get_diagnosis_options(biomarker)


@router.get(
    "/cohorts/{cohort}/diagnoses/{diagnosis}",
    description="Get biomarker measurements for a cohort and diagnosis group.",
    response_model=list[float],
)
async def get_filtered_biomarker_data(
    biomarker: Annotated[str, Query(min_length=1, description="Biomarker variable name.")],
    cohort: Annotated[str, Path(min_length=1, description="Cohort name.")],
    diagnosis: Annotated[str, Path(min_length=1, description="Diagnosis group, or Complete for all diagnosesas.")],
    service: Annotated[BiomarkerService, Depends(get_biomarker_service)],
) -> list[float]:
    """Return matching biomarker measurement values."""
    return await service.get_measurements(variable=biomarker, cohort_name=cohort, diagnosis=diagnosis)
