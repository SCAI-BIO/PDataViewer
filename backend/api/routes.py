import logging
import os
import sys

sys.path.insert(0, "../../backend")

from api.visualization import generate_chords

from contextlib import asynccontextmanager

import pandas as pd

from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response


resources = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # On startup
    resources["msg"] = "Successfully initialized credentials"
    yield
    # On shutdown
    resources.clear()


app = FastAPI(
    title="PDATAVIEWER API",
    description="API interface to access programmatic functionalities of PDATAVIEWER",
    version="0.0.0",
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

logger = logging.getLogger("uvicorn.info")


@app.get("/", include_in_schema=False)
def swagger_redirect():
    return RedirectResponse(url="/docs")


@app.get("/version", tags=["info"])
def get_current_version():
    return app.version


@app.get("/error", status_code=200, tags=["info"])
def get_error_log(response: Response):
    if os.path.isfile("error.txt"):
        with open("error.txt") as f:
            error = f.read()
        return {"content": error}
    else:
        response.status_code = 204
        return {"content": "No error occurred."}


@app.get("/cdm", tags=["info"])
def get_cdm():
    folder_path = "../cdm"
    files = [file for file in os.listdir(folder_path) if file.endswith(".csv")]
    dfs = [pd.read_csv(os.path.join(folder_path, file), keep_default_na=False) for file in files]
    cdm = pd.concat(dfs, ignore_index=True)
    return cdm.to_dict()


@app.get("/cdm/available_modalities", tags=["info"])
def get_available_modalities():
    folder_path = "../cdm"
    files = [file.replace(".csv", "") for file in os.listdir(folder_path) if file.endswith(".csv")]
    return {idx: file for idx, file in enumerate(files)}


@app.get("/cdm/{modality}", tags=["search"])
def get_modality(modality: str):
    folder_path = "../cdm"
    mappings = pd.read_csv(f"{folder_path}/{modality}.csv", keep_default_na=False)
    return mappings.to_dict()


@app.post("/visualization/chords/{modality}", tags=["visualization"])
def get_chords(modality: str, cohorts: list[str]):
    chords, decoder = generate_chords(modality, cohorts)
    return chords, decoder
