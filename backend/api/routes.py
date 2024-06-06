import logging
import os

from functions.visualization import generate_chords
from functions.preprocessing import merge_modalities, clean_extra_columns
from functions.studypicker import rank_cohorts
from functions.autocomplete import autocomplete

from contextlib import asynccontextmanager

import pandas as pd

from pydantic import BaseModel
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


class ChordsRequest(BaseModel):
    modality: str
    cohorts: list[str]


@app.get("/", include_in_schema=False)
def swagger_redirect():
    return RedirectResponse(url="/docs")


@app.get("/version", tags=["info"], description="Gets API version")
def get_current_version():
    return app.version


@app.get("/cdm", tags=["info"], description="Gets PASSIONATE CDM")
def get_cdm():
    cdm = merge_modalities()
    return cdm.to_dict()


@app.get("/cdm/cohorts", tags=["info"])
def get_cohorts():
    """
    Get all cohorts available in PASSIONATE.
    """
    cdm = merge_modalities()
    cdm = clean_extra_columns(cdm, extra_columns=["Feature", "CURIE", "Definition", "Synonyms", "OMOP"])
    return cdm.columns.to_list()


@app.get("/cdm/features", tags=["info"])
def get_features():
    """
    Get all features available in PASSIONATE.
    """
    features = merge_modalities(usecols=["Feature"])
    return features.to_dict("list")


@app.get("/cdm/modalities", tags=["info"])
def get_modalities():
    """
    Get all modalities available in PASSIONATE.
    """
    files = [file.replace(".csv", "") for file in os.listdir("./cdm") if file.endswith(".csv")]
    return files


@app.get("/cdm/modalities/{modality}", tags=["search"])
def get_modality(modality: str):
    """
    Get all features of a modality.
    """
    if not os.path.exists(f"./cdm/{modality}.csv"):
        raise HTTPException(status_code=404, detail="Modality not found")
    mappings = pd.read_csv(f"./cdm/{modality}.csv", keep_default_na=False)
    return mappings.to_dict()


@app.post("/visualization/chords/", tags=["visualization"])
def get_chords(request: ChordsRequest):
    """
    Generates links between mappings to visualize with chord diagram.
    """
    modality = request.modality
    cohorts = request.cohorts
    if not os.path.exists(f"./cdm/{modality}.csv"):
        raise HTTPException(status_code=404, detail="Modality not found")
    data = generate_chords(modality, cohorts)
    return data


@app.post("/studypicker/rank", tags=["studypicker"])
def get_ranked_cohorts(features: list[str]):
    """
    Ranks cohorts based on the availability of given features.
    """
    ranked_cohorts = rank_cohorts(features)
    return ranked_cohorts.to_dict(orient="records")


@app.get("/autocompletion", tags=["autocompletion"])
def autocompletion(text: str):
    """
    Autocomplete user's query.
    """
    return autocomplete(text)
