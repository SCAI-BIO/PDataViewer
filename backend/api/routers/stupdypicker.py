from typing import Annotated

from database.postgresql import PostgreSQLRepository
from fastapi import APIRouter, Depends

from api.dependencies import get_client

router = APIRouter(prefix="/studypicker", tags=["studypicker"], dependencies=[Depends(get_client)])


@router.post("/rank", description="Ranks cohorts based on the availability of given variables.")
def get_ranked_cohorts(variables: list[str], database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    rank = database.rank_cohorts(variables)
    return rank.to_dict(orient="records")
