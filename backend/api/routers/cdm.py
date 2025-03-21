from typing import Annotated

import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from repository.sqllite import SQLLiteRepository

from api.dependencies import get_db

router = APIRouter(prefix="/cdm", tags=["cdm"], dependencies=[Depends(get_db)])


@router.get("/", description="Gets PASSIONATE CDM")
def get_cdm(database: Annotated[SQLLiteRepository, Depends(get_db)]):
    cdm = database.get_cdm()
    cdm.replace({np.nan: "", "No total score.": ""}, inplace=True)
    return cdm.to_dict()


@router.get("/cohorts", description="Get all cohorts available in PASSIONATE.")
def get_cohorts(database: Annotated[SQLLiteRepository, Depends(get_db)]):
    cdm = database.get_cdm()
    cdm.replace({np.nan: "", "No total score.": ""}, inplace=True)
    cdm.drop(
        [
            "Feature",
            "CURIE",
            "Definition",
            "Synonyms",
            "OMOP",
            "UMLS",
            "UK Biobank",
            "Rank",
        ],
        axis=1,
        inplace=True,
    )
    return cdm.columns.to_list()


@router.get("/features", description="Get all features available in PASSIONATE.")
def get_features(database: Annotated[SQLLiteRepository, Depends(get_db)]):
    features = database.get_cdm(columns=["Feature"])
    return features.to_dict("list")


@router.get("/modalities", description="Get all modalities available in PASSIONATE.")
def get_modalities(database: Annotated[SQLLiteRepository, Depends(get_db)]):
    modalities = database.retrieve_table("modality", columns=["Modality"])["Modality"]
    return modalities.to_list()


@router.get("/modalities/{modality}", description="Get all features of a modality.")
def get_modality(
    modality: str, database: Annotated[SQLLiteRepository, Depends(get_db)]
):
    if modality not in database.get_table_names():
        raise HTTPException(status_code=404, detail="Table not found.")
    mappings = database.retrieve_table(table_name=modality)
    mappings.replace({np.nan: ""}, inplace=True)
    return mappings.to_dict()
