from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException

from pdataviewer.api.dependencies import get_analytics_repository, get_concept_repository
from pdataviewer.api.schemas import RankedCohort
from pdataviewer.database.models import ConceptSource
from pdataviewer.database.repositories import AnalyticsRepository, ConceptRepository

router = APIRouter(prefix="/study-picker", tags=["study-picker"])

# Study Picker should not offer structural identifiers as measurement variables.
EXCLUDED_VARIABLES = frozenset({"participant id"})


def _is_selectable_variable(variable: str) -> bool:
    return variable.strip().casefold() not in EXCLUDED_VARIABLES


@router.get("/variables", response_model=list[str])
async def get_study_picker_variables(
    repository: Annotated[ConceptRepository, Depends(get_concept_repository)],
) -> list[str]:
    """Return CDM variables selectable for cohort ranking."""
    variables = await repository.get_variable_names(source_type=ConceptSource.CDM)
    return [variable for variable in variables if _is_selectable_variable(variable)]


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
    if any(not _is_selectable_variable(variable) for variable in variables):
        raise HTTPException(status_code=422, detail="Participant ID cannot be used for cohort ranking.")

    ranking = await repository.rank_cohorts(variables)
    return [RankedCohort.model_validate(record) for record in ranking.to_dict(orient="records")]
