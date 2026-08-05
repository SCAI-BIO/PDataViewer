from typing import TypedDict


class ChordNode(TypedDict):
    name: str
    group: str


class ChordLink(TypedDict):
    source: str
    target: str


class ChordDiagramData(TypedDict):
    nodes: list[ChordNode]
    links: list[ChordLink]


class LongitudinalMeasurementRecord(TypedDict):
    id: int
    months: float
    variable: str
    patientCount: int
    totalPatientCount: int
    cohort: str
