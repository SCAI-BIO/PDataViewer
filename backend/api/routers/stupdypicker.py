from typing import Annotated

from fastapi import APIRouter, Depends
from functions.studypicker import rank_cohorts

from api.dependencies import get_client
from backend.database.postgresql import PostgreSQLRepository

router = APIRouter(
    prefix="/studypicker", tags=["studypicker"], dependencies=[Depends(get_client)]
)


@router.post(
    "/rank", description="Ranks cohorts based on the availability of given features."
)
def get_ranked_cohorts(
    features: list[str], database: Annotated[PostgreSQLRepository, Depends(get_client)]
):
    ranked_cohorts = rank_cohorts(features, repo=database)
    return ranked_cohorts.to_dict(orient="records")
