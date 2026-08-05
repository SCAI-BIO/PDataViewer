from enum import StrEnum

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class APIModel(BaseModel):
    """Base model for API schemas using camelCase JSON fields."""

    model_config = ConfigDict(
        alias_generator=to_camel, validate_by_name=True, serialize_by_alias=True, from_attributes=True
    )


class CohortMetadata(APIModel):
    """Metadata describing the participants and provenance of a cohort."""

    participants: int | None
    control_participants: int | None
    prodromal_participants: int | None
    pd_participants: int | None
    longitudinal_participants: int | None
    follow_up_interval: str | None
    location: str | None
    doi: str | None
    link: str | None
    color: str


class LongitudinalData(APIModel):
    """Participant availability for a variable at one cohort visit."""

    months: float
    cohort: str
    patient_count: int
    total_patient_count: int


class ChordNode(APIModel):
    """One variable node in a chord diagram."""

    name: str
    group: str


class ChordLink(APIModel):
    """One connection between two chord-diagram nodes."""

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
