import logging
import os

from preprocessing.visualization import generate_chords
from preprocessing.merge_clean import merge_modalities, clean_extra_columns
from preprocessing.studypicker import rank_cohorts

from contextlib import asynccontextmanager

import pandas as pd

from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from starlette.middleware.cors import CORSMiddleware

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


@app.get("/cdm", tags=["info"])
def get_cdm():
    cdm = merge_modalities()
    return cdm.to_dict()


@app.get("/cdm/cohorts", tags=["info"])
def get_cohorts():
    cdm = merge_modalities()
    cdm = clean_extra_columns(cdm)
    return {idx: cohort for idx, cohort in enumerate(cdm.columns)}


@app.get("/cdm/features", tags=["info"])
def get_features():
    features = merge_modalities(usecols=["Feature"])
    return features.to_dict()


@app.get("/cdm/modalities", tags=["info"])
def get_modalities():
    files = [file.replace(".csv", "") for file in os.listdir("./cdm") if file.endswith(".csv")]
    return {idx: file for idx, file in enumerate(files)}


@app.get("/cdm/modalities/{modality}", tags=["search"])
def get_modality(modality: str):
    mappings = pd.read_csv(f"{'./cdm'}/{modality}.csv", keep_default_na=False)
    return mappings.to_dict()


@app.post("/visualization/chords/{modality}", tags=["visualization"])
def get_chords(modality: str, cohorts: list[str]):
    chords, decoder = generate_chords(modality, cohorts)
    return chords, decoder


@app.post("/studypicker/rank", tags=["studypicker"])
def get_ranked_cohorts(features: list[str]):
    ranked_cohorts = rank_cohorts(features)
    return ranked_cohorts.to_dict()
