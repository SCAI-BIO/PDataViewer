from typing import Annotated

from fastapi import APIRouter, Depends
from functions.autocomplete import autocomplete
from repository.sqllite import SQLLiteRepository

from api.dependencies import get_db

router = APIRouter(
    prefix="/autocompletion", tags=["autocompletion"], dependencies=[Depends(get_db)]
)


@router.get("/", description="Autocomplete user's query.")
def get_autocompletion(
    text: str, database: Annotated[SQLLiteRepository, Depends(get_db)]
):
    return autocomplete(text, repo=database)
