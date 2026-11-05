from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query

from pdataviewer.api.dependencies.database import get_cohort_race_repository, get_race_repository
from pdataviewer.api.schemas import CohortRaceData, RaceDistributionData
from pdataviewer.database.repositories import CohortRaceRepository, RaceRepository

router = APIRouter(prefix="/races", tags=["races"])


@router.get("/", description="Get all available race categories.", response_model=list[str])
async def get_race_categories(repository: Annotated[RaceRepository, Depends(get_race_repository)]) -> list[str]:
    """Return all available race categories."""
    records = await repository.get_all()
    return [record.race for record in records]


@router.get(
    "/distribution",
    description="Get aggregated race selections across cohorts.",
    response_model=list[RaceDistributionData],
)
async def get_race_distribution(
    repository: Annotated[CohortRaceRepository, Depends(get_cohort_race_repository)],
    cohorts: Annotated[list[str] | None, Query(description="Optional cohort names used to filter results.")] = None,
) -> list[RaceDistributionData]:
    """Return race distributions for all or selected cohorts."""
    records = await repository.get_distribution(cohort_names=cohorts)
    return [RaceDistributionData.model_validate(record) for record in records]


@router.get(
    "/cohorts",
    description="Get names of cohorts with imported race data.",
    response_model=list[str],
)
async def get_race_cohorts(
    repository: Annotated[CohortRaceRepository, Depends(get_cohort_race_repository)],
) -> list[str]:
    """Return cohorts available for race distribution filtering."""
    return await repository.get_cohort_names()


@router.get(
    "/cohorts/{cohort_name}",
    description="Get race response counts for a specific cohort.",
    response_model=list[CohortRaceData],
)
async def get_cohort_race_data(
    cohort_name: Annotated[str, Path(min_length=1, description="Cohort name.")],
    repository: Annotated[CohortRaceRepository, Depends(get_cohort_race_repository)],
) -> list[CohortRaceData]:
    """Return race response counts for an individual cohort."""
    records = await repository.get_by_cohort(cohort_name)

    return [
        CohortRaceData(
            name=record.race.race,
            selected_count=record.selected_count,
            valid_count=record.valid_count,
            unknown_count=record.unknown_count,
            missing_count=record.missing_count,
        )
        for record in records
    ]
