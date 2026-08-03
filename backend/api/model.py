from enum import Enum

from pydantic import BaseModel


class CohortMetadata(BaseModel):
    participants: int | None
    controlParticipants: int | None
    prodromalParticipants: int | None
    pdParticipants: int | None
    longitudinalParticipants: int | None
    followUpInterval: str | None
    location: str | None
    doi: str | None
    link: str | None
    color: str


class LongitudinalData(BaseModel):
    months: float
    cohort: str
    patientCount: int
    totalPatientCount: int


class UploadType(str, Enum):
    LONGITUDINAL = "longitudinal"
    BIOMARKERS = "biomarkers"
    METADATA = "metadata"
    CDM = "cdm"
