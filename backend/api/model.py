from enum import Enum
from typing import Optional

from pydantic import BaseModel


class PathModel(BaseModel):
    path: str


class CohortMetadata(BaseModel):
    participants: Optional[int]
    controlParticipants: Optional[int]
    prodromalParticipants: Optional[int]
    pdParticipants: Optional[int]
    longitudinalParticipants: Optional[int]
    followUpInterval: Optional[str]
    location: Optional[str]
    doi: Optional[str]
    link: Optional[str]
    color: str


class UploadType(str, Enum):
    LONGITUDINAL = "longitudinal"
    BIOMARKERS = "biomarkers"
    METADATA = "metadata"
    CDM = "cdm"
