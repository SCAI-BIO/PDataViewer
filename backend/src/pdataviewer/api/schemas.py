from enum import StrEnum
from typing import Self

from pydantic import BaseModel, ConfigDict, FiniteFloat, NonNegativeInt, model_validator
from pydantic.alias_generators import to_camel


class APIModel(BaseModel):
    """Base model accepting field names or aliases and emitting camelCase JSON."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        validate_by_name=True,
        validate_by_alias=True,
        serialize_by_alias=True,
        from_attributes=True,
    )


class CohortMetadata(APIModel):
    """Cohort metadata whose nullable fields are still required in responses."""

    participants: NonNegativeInt | None
    control_participants: NonNegativeInt | None
    prodromal_participants: NonNegativeInt | None
    pd_participants: NonNegativeInt | None
    longitudinal_participants: NonNegativeInt | None
    follow_up_interval: str | None
    location: str | None
    doi: str | None
    link: str | None
    color: str


class LongitudinalData(APIModel):
    """Participant availability for a variable at one cohort visit."""

    months: FiniteFloat
    cohort: str
    patient_count: NonNegativeInt
    total_patient_count: NonNegativeInt

    @model_validator(mode="after")
    def validate_patient_counts(self) -> Self:
        """Require the observed count to fit within the cohort total."""
        if self.patient_count > self.total_patient_count:
            raise ValueError("patientCount cannot exceed totalPatientCount")

        return self


class ChordNode(APIModel):
    """A cohort-concept node with a unique ID and a display label."""

    id: str
    name: str
    group: str


class ChordLink(APIModel):
    """One unidirected connection whose endpoints reference chord-node IDs."""

    source: str
    target: str


class ChordDiagramData(APIModel):
    """Nodes and links required to render a chord diagram."""

    nodes: list[ChordNode]
    links: list[ChordLink]


class RankedCohort(APIModel):
    """A cohort ranked by availability of requested variables."""

    cohort: str
    found: str
    missing: str


class MessageResponse(APIModel):
    """A response containing a human-readable status message."""

    message: str


class UploadType(StrEnum):
    """Supported database import categories."""

    LONGITUDINAL = "longitudinal"
    BIOMARKERS = "biomarkers"
    METADATA = "metadata"
    CDM = "cdm"
