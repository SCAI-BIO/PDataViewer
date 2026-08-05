from typing import Annotated

from fastapi import APIRouter, Depends, Path

from api.dependencies import get_longitudinal_repository
from api.schemas import LongitudinalData
from database.repositories import LongitudinalRepository

router = APIRouter(prefix="/longitudinal", tags=["longitudinal"])


@router.get("/", description="Get all available longitudinal variables.", response_model=list[str])
async def get_longitudinal_variables(
    repository: Annotated[LongitudinalRepository, Depends(get_longitudinal_repository)],
) -> list[str]:
    """Return all variables with longitudinal measurements."""
    return await repository.get_variables()


@router.get(
    "/{variable}", description="Retrieve longitudinal data for a variable.", response_model=list[LongitudinalData]
)
async def get_longitudinal_data(
    variable: Annotated[str, Path(min_length=1, description="Longitudinal variable name")],
    repository: Annotated[LongitudinalRepository, Depends(get_longitudinal_repository)],
) -> list[LongitudinalData]:
    """Return longitudinal data for a variable across cohorts."""
    records = await repository.get_all(variable=variable)
    return [LongitudinalData.model_validate(record) for record in records]


@router.get(
    "/{variable}/{cohort}",
    description="Retrieve longitudinal data for a variable within a specific cohort.",
    response_model=list[LongitudinalData],
)
async def get_longitudinal_data_for_cohort(
    variable: Annotated[str, Path(min_length=1, description="Longitudinal variable name.")],
    cohort: Annotated[str, Path(min_length=1, description="Cohort name.")],
    repository: Annotated[LongitudinalRepository, Depends(get_longitudinal_repository)],
) -> list[LongitudinalData]:
    """Return longitudinal data for one variable and cohort"""
    records = await repository.get_all(variable=variable, cohort_name=cohort)
    return [LongitudinalData.model_validate(record) for record in records]
