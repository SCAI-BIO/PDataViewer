from typing import Annotated

from fastapi import Depends

from pdataviewer.api.dependencies.database import get_biomarker_repository
from pdataviewer.api.services.biomarkers import BiomarkerService
from pdataviewer.database.repositories.biomarkers import BiomarkerRepository


def get_biomarker_service(
    repository: Annotated[BiomarkerRepository, Depends(get_biomarker_repository)],
) -> BiomarkerService:
    """Provide the biomarker application service."""
    return BiomarkerService(repository)
