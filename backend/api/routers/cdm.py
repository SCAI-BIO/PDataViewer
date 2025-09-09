from typing import Annotated

import numpy as np
from database.models import ConceptSource
from database.postgresql import PostgreSQLRepository
from fastapi import APIRouter, Depends

from api.dependencies import get_client

router = APIRouter(prefix="/cdm", tags=["cdm"], dependencies=[Depends(get_client)])


@router.get("/", description="Gets PASSIONATE CDM")
def get_cdm(database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    cdm = database.get_cdm()
    cdm.replace({np.nan: "", "No total score.": ""}, inplace=True)
    return cdm.to_dict()


@router.get("/features", description="Get all features available in PASSIONATE.")
def get_features(database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    return database.get_concepts(source_type=ConceptSource.CDM)


@router.get("/modalities", description="Get all modalities available in PASSIONATE.")
def get_modalities(database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    return database.get_modalities()


@router.get("/modalities/{modality}", description="Get all features of a modality.")
def get_modality(modality: str, database: Annotated[PostgreSQLRepository, Depends(get_client)]):
    return database.get_concepts(modality=modality)
