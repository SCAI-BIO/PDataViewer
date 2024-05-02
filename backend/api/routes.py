import logging
import os

from preprocessing.visualization import generate_chords
from preprocessing.merge_clean import merge_modalities, clean_extra_columns
from preprocessing.studypicker import rank_cohorts

from contextlib import asynccontextmanager

import pandas as pd

from thefuzz import process, fuzz

from fastapi import FastAPI, HTTPException
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
    """
    Get the version of the API.
    """
    return app.version


@app.get("/cdm", tags=["info"])
def get_cdm():
    """
    Get PASSIONATE CDM.
    """
    cdm = merge_modalities()
    return cdm.to_dict()


@app.get("/cdm/cohorts", tags=["info"])
def get_cohorts():
    """
    Get all cohorts available in PASSIONATE.
    """
    cdm = merge_modalities()
    cdm = clean_extra_columns(cdm)
    return {idx: cohort for idx, cohort in enumerate(cdm.columns)}


@app.get("/cdm/features", tags=["info"])
def get_features():
    """
    Get all features available in PASSIONATE.
    """
    features = merge_modalities(usecols=["Feature"])
    return features.to_dict()


@app.get("/cdm/modalities", tags=["info"])
def get_modalities():
    """
    Get all modalities available in PASSIONATE.
    """
    files = [file.replace(".csv", "") for file in os.listdir("./cdm") if file.endswith(".csv")]
    return {idx: file for idx, file in enumerate(files)}


@app.get("/cdm/modalities/{modality}", tags=["search"])
def get_modality(modality: str):
    """
    Get all features of a modality.
    """
    if not os.path.exists(f"./cdm/{modality}.csv"):
        raise HTTPException(status_code=404, detail="Modality not found")
    mappings = pd.read_csv(f"./cdm/{modality}.csv", keep_default_na=False)
    return mappings.to_dict()


@app.post("/visualization/chords/{modality}", tags=["visualization"])
def get_chords(modality: str, cohorts: list[str]):
    """
    Generates links between mappings to visualize with chord diagram.
    """
    if not os.path.exists(f"./cdm/{modality}.csv"):
        raise HTTPException(status_code=404, detail="Modality not found")
    chords, decoder = generate_chords(modality, cohorts)
    return chords, decoder


@app.post("/studypicker/rank", tags=["studypicker"])
def get_ranked_cohorts(features: list[str]):
    """
    Ranks cohorts based on the availability of given features.
    """
    ranked_cohorts = rank_cohorts(features)
    return ranked_cohorts.to_dict()


@app.get("/autocompletion", tags=["autocompletion"])
def autocomplete(text: str):
    """
    Autocomplete user's query.
    """
    features = merge_modalities(usecols=["Feature"])
    features = features["Feature"].to_list()
    threshold = 50
    suggestions = process.extract(text, features, scorer=fuzz.partial_token_set_ratio, limit=10)
    return [suggestions[0] for suggestions in suggestions if suggestions[1] >= threshold]
