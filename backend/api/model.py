from pydantic import BaseModel


class ChordsRequest(BaseModel):
    modality: str
    cohorts: list[str]


class PathModel(BaseModel):
    path: str
