from enum import Enum

from pydantic import BaseModel


class ChordsRequest(BaseModel):
    modality: str
    cohorts: list[str]


class PathModel(BaseModel):
    path: str


class UploadType(str, Enum):
    LONGITUDINAL = "longitudinal"
    BIOMARKERS = "biomarkers"
    METADATA = "metadata"
    CDM = "cdm"
