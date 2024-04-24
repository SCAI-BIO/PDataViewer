import logging
import os
import sys
import json

sys.path.insert(0, "../../backend")

from api.auth import init_credentials

from contextlib import asynccontextmanager

import numpy as np
import pandas as pd

from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response


resources = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # On startup
    # init_credentials()
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
    app.version


@app.get("/error", status_code=200, tags=["info"])
def get_error_log(response: Response):
    if os.path.isfile("error.txt"):
        with open("error.txt") as f:
            error = f.read()
        return {"content": error}
    else:
        response.status_code = 204
        return {"content": "No error occurred."}


@app.get("/datasets", tags=["info"])
def get_available_datasets():
    datasets = [f for f in os.listdir("../datasets") if os.path.isdir(os.path.join("../datasets", f))]
    datasets_sorted = np.sort(datasets)
    return {idx: dataset for idx, dataset in enumerate(datasets_sorted)}


@app.get("/datasets/cdm", tags=["info"])
def get_cdm():
    folder_path = "../datasets/cdm"
    files = [file for file in os.listdir(folder_path) if file.endswith(".csv")]
    dfs = [pd.read_csv(os.path.join(folder_path, file), keep_default_na=False) for file in files]
    cdm = pd.concat(dfs, ignore_index=True)
    return cdm.to_dict()


@app.get("/datasets/cdm/available_modalities", tags=["info"])
def get_available_modalities():
    folder_path = "../datasets/cdm"
    files = [file.replace(".csv", "") for file in os.listdir(folder_path) if file.endswith(".csv")]
    return {idx: file for idx, file in enumerate(files)}


@app.get("/datasets/cdm/{modality}", tags=["search"])
def get_modality(modality: str):
    folder_path = "../datasets/cdm"
    mappings = pd.read_csv(f"{folder_path}/{modality}.csv", keep_default_na=False) 
    return mappings.to_dict()


@app.get("/datasets/decoder/available_decoders", tags=["info"])
def get_available_decoders():
    folder_path = "../datasets/decoder"
    files = [file.replace("_decoder.json", "") for file in os.listdir(folder_path) if file.endswith(".json")]
    return {idx: file for idx, file in enumerate(files)}


@app.get("/datasets/decoder/{modality}", tags=["search"])
def get_decoder(modality: str):
    folder_path = "../datasets/decoder"
    f = open(f"{folder_path}/{modality}_decoder.json")
    decoder = json.load(f)
    return decoder


@app.post("/visualization/chords/{modality}", tags=["visualization"])
def get_chords(modality: str, cohorts: list[str]):
    # Initialize a dictionary to decode the numbers of variables later on, and save used cohorts
    decoder = {}
    decoder["cohorts"] = cohorts
    # Read the .csv file
    folder_path = "../datasets/cdm"
    mappings = pd.read_csv(f"{folder_path}/{modality}.csv", usecols=cohorts)
    # Filter out rows with only 1 mapping
    mappings = mappings[mappings.notna().sum(axis=1) > 1]
    # Filter out empty columns
    mappings.dropna(how="all", axis=1, inplace=True)
    # Encode DataFrame values to consecutive numbers (starting from 1) for non-NaN values
    for column in mappings.columns:
        number = 1
        for row in mappings.index:
            if pd.notna(mappings.loc[row, column]):
                # If the cohort does not exist in the dictionary,
                # initialize it with an empty dictionary
                if column not in decoder.keys():
                    decoder[column] = {}
                # Save the encoded number of the variable to decoder dictionary
                decoder[column][number] = mappings.loc[row, column]
                mappings.loc[row, column] = number
                number += 1
    # Save the decoder as json
    with open(f"../datasets/decoder/{modality}_decoder.json", "w") as outfile:
        json.dump(decoder, outfile)
    # Create an empty data frame with column names
    chords = pd.DataFrame(columns=["link_id", "cohort", "start", "end"])
    # Populate chords with link_ids
    link_id = 0
    for row in mappings.index:
        for column in mappings.columns:
            value = mappings.loc[row, column]
            if pd.notna(value):
                chords.loc[len(chords.index)] = [f"link_{link_id}", column, value, value]
        link_id += 1
    return chords.to_dict()