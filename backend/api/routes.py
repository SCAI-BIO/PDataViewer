import logging
from contextlib import asynccontextmanager

import numpy as np
from fastapi import Depends, FastAPI, File, UploadFile
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBasicCredentials
from functions.autocomplete import autocomplete
from functions.studypicker import rank_cohorts
from functions.visualization import generate_chords
from pydantic import BaseModel
from repository.sqllite import CDMRepository
from starlette.middleware.cors import CORSMiddleware

from api.auth import authenticate_user, init_credentials

resources = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # On startup
    init_credentials()
    resources["msg"] = "Successfully initialized credentials"
    yield
    # On shutdown
    resources.clear()


app = FastAPI(
    title="PDATAVIEWER API",
    description="API interface to access programmatic functionalities of PDATAVIEWER",
    version="0.0.2",
    terms_of_service="https://www.scai.fraunhofer.de",
    contact={
        "name": "Dr. Marc Jacobs",
        "email": "marc.jacobs@scai.fraunhofer.de",
    },
    license_info={
        "name": "Apache 2.0",
        "url": "https://www.apache.org/licenses/LICENSE-2.0.html",
    },
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChordsRequest(BaseModel):
    modality: str
    cohorts: list[str]


class PathModel(BaseModel):
    path: str


logger = logging.getLogger("uvicorn.info")
cdm_repo = CDMRepository()


@app.get("/", include_in_schema=False)
def swagger_redirect():
    return RedirectResponse(url="/docs")


@app.get("/version", tags=["info"], description="Gets API version")
def get_current_version():
    return app.version


@app.get("/cdm", tags=["info"], description="Gets PASSIONATE CDM")
def get_cdm():
    cdm = cdm_repo.get_cdm()
    cdm.replace({np.nan: "", "No total score.": ""}, inplace=True)
    return cdm.to_dict()


@app.get("/cdm/cohorts", tags=["info"])
def get_cohorts():
    """
    Get all cohorts available in PASSIONATE.
    """
    cdm = cdm_repo.get_cdm()
    cdm.replace({np.nan: "", "No total score.": ""}, inplace=True)
    cdm.drop(
        ["Feature", "CURIE", "Definition", "Synonyms", "OMOP"], axis=1, inplace=True
    )
    return cdm.columns.to_list()


@app.get("/cdm/features", tags=["info"])
def get_features():
    """
    Get all features available in PASSIONATE.
    """
    features = cdm_repo.get_columns(columns=["Feature"])
    return features.to_dict("list")


@app.get("/cdm/modalities", tags=["info"])
def get_modalities():
    """
    Get all modalities available in PASSIONATE.
    """
    files = cdm_repo.get_table_names()
    return files


@app.get("/cdm/modalities/{modality}", tags=["search"])
def get_modality(modality: str):
    """
    Get all features of a modality.
    """
    mappings = cdm_repo.retrieve_table(table_name=modality)
    mappings.replace({np.nan: ""}, inplace=True)
    return mappings.to_dict()


@app.post("/visualization/chords/", tags=["visualization"])
def get_chords(request: ChordsRequest):
    """
    Generates links between mappings to visualize with chord diagram.
    """
    modality = request.modality
    cohorts = request.cohorts
    data = generate_chords(modality, cohorts, repo=cdm_repo)
    return data


@app.post("/studypicker/rank", tags=["studypicker"])
def get_ranked_cohorts(features: list[str]):
    """
    Ranks cohorts based on the availability of given features.
    """
    ranked_cohorts = rank_cohorts(features, repo=cdm_repo)
    return ranked_cohorts.to_dict(orient="records")


@app.get("/autocompletion", tags=["autocompletion"])
def autocompletion(text: str):
    """
    Autocomplete user's query.
    """
    return autocomplete(text, repo=cdm_repo)


@app.post("/database/cdm/import", tags=["database"])
def update_cdm_db(file: UploadFile = File(...), credentials: HTTPBasicCredentials = Depends(authenticate_user)):
    """
    Update the database from the specified CSV folder path.
    """
    # TODO: Write a function that can directly work with the uploaded file.
    pass


@app.delete("/database/cdm", tags=["database"])
def delete_cdm_db(credentials: HTTPBasicCredentials = Depends(authenticate_user)):
    """
    Delete the database.
    """
    cdm_repo.delete_database()
    return {"message": "Database deleted successfully!"}


@app.delete("/database/cdm/{table}", tags=["database"])
def delete_cdm_modality(table: str, credentials: HTTPBasicCredentials = Depends(authenticate_user)):
    """
    Delete a modality from CDM database.
    """
    cdm_repo.delete_table(table)
    return {"message": "Table deleted successfully!"}
