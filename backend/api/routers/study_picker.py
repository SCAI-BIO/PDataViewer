from typing import Annotated

from fastapi import APIRouter, Body, Depends

from api.dependencies import get_analytics_repository
from api.schemas import RankedCohort
from database.repositories import AnalyticsRepository

router = APIRouter(prefix="/study-picker", tags=["study-picker"])


@router.post(
    "/rank",
    description="Rank cohorts based on the availability of the requested CDM variables.",
    response_model=list[RankedCohort],
)
async def get_ranked_cohorts(
    variables: Annotated[list[str], Body(min_length=1, description="CDM variables used to rank cohorts.")],
    repository: Annotated[AnalyticsRepository, Depends(get_analytics_repository)],
) -> list[RankedCohort]:
    """Return cohorts ranked by variable availability."""
    ranking = await repository.rank_cohorts(variables)
    return [RankedCohort.model_validate(record) for record in ranking.to_dict(orient="records")]
