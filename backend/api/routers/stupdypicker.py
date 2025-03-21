from typing import Annotated

from fastapi import APIRouter, Depends
from functions.studypicker import rank_cohorts
from repository.sqllite import SQLLiteRepository

from api.dependencies import get_db

router = APIRouter(
    prefix="/studypicker", tags=["studypicker"], dependencies=[Depends(get_db)]
)


@router.post(
    "/rank", description="Ranks cohorts based on the availability of given features."
)
def get_ranked_cohorts(
    features: list[str], database: Annotated[SQLLiteRepository, Depends(get_db)]
):
    ranked_cohorts = rank_cohorts(features, repo=database)
    return ranked_cohorts.to_dict(orient="records")
