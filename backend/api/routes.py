import logging
from contextlib import asynccontextmanager

import numpy as np
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
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


@app.get("/version", tags=["cdm"], description="Gets API version")
def get_current_version():
    return app.version


@app.get("/cdm", tags=["cdm"], description="Gets PASSIONATE CDM")
def get_cdm():
    cdm = cdm_repo.get_cdm()
    cdm.replace({np.nan: "", "No total score.": ""}, inplace=True)
    return cdm.to_dict()


@app.get("/cdm/cohorts", tags=["cdm"])
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


@app.get("/cdm/features", tags=["cdm"])
def get_features():
    """
    Get all features available in PASSIONATE.
    """
    features = cdm_repo.get_columns(columns=["Feature"])
    return features.to_dict("list")


@app.get("/cdm/modalities", tags=["cdm"])
def get_modalities():
    """
    Get all modalities available in PASSIONATE.
    """
    files = cdm_repo.get_table_names()
    return files


@app.get("/cdm/modalities/{modality}", tags=["cdm"])
def get_modality(modality: str):
    """
    Get all features of a modality.
    """
    if modality not in cdm_repo.get_table_names():
        raise HTTPException(status_code=404, detail="Table not found.")
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
def get_autocompletion(text: str):
    """
    Autocomplete user's query.
    """
    return autocomplete(text, repo=cdm_repo)


@app.get("/database/table_names", tags=["database"])
def get_table_names():
    """
    Get all table names available in the database.
    """
    return cdm_repo.get_table_names()


@app.get("/database/{table_name}", tags=["database"])
def get_table(table_name: str):
    """
    Get the content of a table by its name
    """
    if table_name not in cdm_repo.get_table_names():
        raise HTTPException(status_code=404, detail="Table not found.")

    data = cdm_repo.retrieve_table(table_name)
    data.replace({np.nan: ""}, inplace=True)
    return data.to_dict()


@app.post("/database/import", tags=["database"])
async def import_data(file: UploadFile = File(...), credentials: HTTPBasicCredentials = Depends(authenticate_user)):
    """
    Import a CSV file to the database.
    """
    # Check if the file is a csv file
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=400, detail="Invalid file type. Only .csv files are accepted."
        )

    table_name = file.filename[:-4]
    contents = await file.read()
    cdm_repo.store_upload(contents, table_name)
    return {"message": "Data imported successfully!"}


@app.delete("/database/delete/database", tags=["database"])
def delete_database(credentials: HTTPBasicCredentials = Depends(authenticate_user)):
    """
    Delete the database.
    """
    cdm_repo.delete_database()
    return {"message": "Database deleted successfully!"}


@app.delete("/database/delete/{table_name}", tags=["database"])
def delete_table(table_name: str, credentials: HTTPBasicCredentials = Depends(authenticate_user)):
    """
    Delete a table from the database.
    """
    if table_name not in cdm_repo.get_table_names():
        raise HTTPException(status_code=404, detail="Table not found.")
    cdm_repo.delete_table(table_name)
    return {"message": "Table deleted successfully!"}
