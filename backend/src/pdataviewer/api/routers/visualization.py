from typing import Annotated

from fastapi import APIRouter, Depends, Query

from pdataviewer.api.dependencies import get_analytics_repository
from pdataviewer.api.schemas import ChordDiagramData
from pdataviewer.database.repositories import AnalyticsRepository

router = APIRouter(prefix="/visualization", tags=["visualization"])


@router.get(
    "/chords/",
    description="Generates links between cohort mappings for visualization as a chord diagram.",
    response_model=ChordDiagramData,
)
async def get_chord_diagram(
    modality: Annotated[str, Query(min_length=1, description="CDM modality used to filter mappings.")],
    repository: Annotated[AnalyticsRepository, Depends(get_analytics_repository)],
) -> ChordDiagramData:
    chord_data = await repository.get_chord_diagram(modality)
    return ChordDiagramData.model_validate(chord_data)
