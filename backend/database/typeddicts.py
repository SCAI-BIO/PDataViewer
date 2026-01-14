from typing import List, TypedDict


class CohortStats(TypedDict):
    found: int
    missing: List[str]
