from typing import Annotated

from database.postgresql import PostgreSQLRepository
from fastapi import APIRouter, Depends

from api.dependencies import get_client
from api.model import CohortMetadata

router = APIRouter(prefix="/cohorts", tags=["cohorts"], dependencies=[Depends(get_client)])


@router.get("/", description="Get all cohort names")
def get_cohorts(database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    cohorts = database.get_cohorts()
    return [cohort.name for cohort in cohorts]


@router.get("/metadata", response_model=list[CohortMetadata], description="Get cohort metadata")
def get_metadata(database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    cohort_metadata = database.get_cohorts()

    return [
        CohortMetadata(
            name=cm.name,
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
    ]
