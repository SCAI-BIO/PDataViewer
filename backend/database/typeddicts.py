from typing import TypedDict


class CohortStats(TypedDict):
    found: int
    missing: list[str]
