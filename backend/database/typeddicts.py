from typing import List, TypedDict


class ChordDiagramLinks(TypedDict):
    source: str
    target: str


class ChordDiagramNodes(TypedDict):
    name: str
    group: str


class ChordDiagramData(TypedDict):
    links: List[ChordDiagramLinks]
    nodes: List[ChordDiagramNodes]


class CohortStats(TypedDict):
    found: int
    missing: List[str]
