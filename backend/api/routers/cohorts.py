from typing import Annotated

from database.postgresql import PostgreSQLRepository
from fastapi import APIRouter, Depends

from api.dependencies import get_client
from api.model import CohortMetadata

router = APIRouter(prefix="/cohorts", tags=["cohorts"])


@router.get("/", description="Get all cohort names")
async def get_cohorts(database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    cohorts = await database.get_cohorts()
    return [cohort.name for cohort in cohorts]


@router.get("/metadata", description="Get cohort metadata")
async def get_metadata(database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    cohort_metadata = await database.get_cohorts()

    return {
        cm.name: CohortMetadata(
            participants=cm.participants,
            controlParticipants=cm.control_participants,
            prodromalParticipants=cm.prodromal_participants,
            pdParticipants=cm.pd_participants,
            longitudinalParticipants=cm.longitudinal_participants,
            followUpInterval=cm.follow_up_interval,
            location=cm.location,
            doi=cm.doi,
            link=cm.link,
            color=cm.color,
        )
        for cm in cohort_metadata
    }
