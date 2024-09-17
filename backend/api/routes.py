import io
import logging
import zipfile
from contextlib import asynccontextmanager
from typing import Annotated

import numpy as np
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBasicCredentials
from functions.autocomplete import autocomplete
from functions.studypicker import rank_cohorts
from functions.visualization import generate_chords
from pydantic import BaseModel
from repository.sqllite import SQLLiteRepository
from starlette.middleware.cors import CORSMiddleware

from api.auth import authenticate_user, init_credentials

load_dotenv()

resources = {}
logger = logging.getLogger("uvicorn.info")
database = SQLLiteRepository()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing application lifespan...")
    try:
        init_credentials()
        logger.info("Credentials initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing credentials: {e}")
        raise
    yield
    logger.info("Application shutdown.")


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


@app.get("/", include_in_schema=False)
def swagger_redirect():
    return RedirectResponse(url="/docs")


@app.get("/version", tags=["info"])
def get_current_version():
    """
    Current API version.
    """
    return app.version


@app.get("/biomarkers", tags=["biomarkers"])
def get_biomarkers():
    """
    Get all available biomarker tables.
    """
    return database.get_table_names(starts_with="biomarkers_")


@app.get("/biomarkers/{biomarker}", tags=["biomarkers"])
def get_biomarker(biomarker: str):
    """
    Retrieve a biomarker table.
    """
    table_name = "biomarkers_" + biomarker
    data = database.retrieve_table(table_name=table_name)
    return data.to_dict(orient="records")


@app.get("/biomarkers/{biomarker}/cohorts", tags=["biomarkers"])
def get_biomarker_cohorts(biomarker: str):
    """
    Retrieve the list of available cohorts for a biomarker table.
    """
    table_name = "biomarkers_" + biomarker
    data = database.retrieve_table(table_name=table_name)
    return list(data.Cohort.unique())


@app.get("/biomarkers/{biomarker}/diagnoses", tags=["biomarkers"])
def get_cohort_biomarkers(biomarker: str):
    """
    Retrieve the measurements of chosen biomarker for the specified cohort.
    """
    diagnoses = {}
    table_name = "biomarkers_" + biomarker
    data = database.retrieve_table(table_name=table_name)
    for cohort in data.Cohort.unique():
        diagnoses[cohort] = list(data.Diagnosis.unique())
    return diagnoses


@app.get("/biomarkers/{biomarker}/cohorts/{cohort}/diagnoses", tags=["biomarkers"])
def get_biomarker_diagnosis(biomarker: str, cohort: str):
    """
    Get unique diagnoses from a biomarker table.
    """
    table_name = "biomarkers_" + biomarker
    data = database.retrieve_table(table_name=table_name)
    data = data.loc[data["Cohort"] == cohort]
    return list(data.Diagnosis.unique())


@app.get(
    "/biomarkers/{biomarker}/cohorts/{cohort}/diagnoses/{diagnosis}",
    tags=["biomarkers"],
)
def get_filtered_data(biomarker: str, cohort: str, diagnosis: str):
    """
    Filter biomarker data based on the chosen diagnosis type
    """
    table_name = "biomarkers_" + biomarker
    data = database.retrieve_table(table_name=table_name)
    data = data.loc[data["Cohort"] == cohort]
    data = data.loc[data["Diagnosis"] == diagnosis]
    return data.Measurement.to_list()


@app.get("/longitudinal", tags=["longitudinal"])
def get_longitudinal_tables():
    """
    Get all available longitudinal tables.
    """
    return database.get_table_names(starts_with="longitudinal_")


@app.get("/longitudinal/{longitudinal}", tags=["longitudinal"])
def get_longitudinal_table(longitudinal: str):
    """
    Retrieve a longitudinal table.
    """
    table_name = "longitudinal_" + longitudinal
    data = database.retrieve_table(table_name=table_name)
    return data.to_dict(orient="records")


@app.get("/longitudinal/{longitudinal}/{cohort}", tags=["longitudinal"])
def get_longitudinal_table_for_cohort(longitudinal: str, cohort: str):
    """
    Retrieve a longitudinal table.
    """
    table_name = "longitudinal_" + longitudinal
    data = database.retrieve_table(table_name=table_name)
    data = data.loc[data.Cohort == cohort]
    return data.to_dict(orient="records")


@app.get("/cdm", tags=["cdm"], description="Gets PASSIONATE CDM")
def get_cdm():
    cdm = database.get_cdm()
    cdm.replace({np.nan: "", "No total score.": ""}, inplace=True)
    return cdm.to_dict()


@app.get("/cdm/cohorts", tags=["cdm"])
def get_cohorts():
    """
    Get all cohorts available in PASSIONATE.
    """
    cdm = database.get_cdm()
    cdm.replace({np.nan: "", "No total score.": ""}, inplace=True)
    cdm.drop(
        ["Feature", "CURIE", "Definition", "Synonyms", "OMOP", "Rank"],
        axis=1,
        inplace=True,
    )
    return cdm.columns.to_list()


@app.get("/cdm/features", tags=["cdm"])
def get_features():
    """
    Get all features available in PASSIONATE.
    """
    features = database.get_cdm(columns=["Feature"])
    return features.to_dict("list")


@app.get("/cdm/modalities", tags=["cdm"])
def get_modalities():
    """
    Get all modalities available in PASSIONATE.
    """
    modalities = database.retrieve_table("modality", columns=["Modality"])["Modality"]
    return modalities.to_list()


@app.get("/cdm/modalities/{modality}", tags=["cdm"])
def get_modality(modality: str):
    """
    Get all features of a modality.
    """
    if modality not in database.get_table_names():
        raise HTTPException(status_code=404, detail="Table not found.")
    mappings = database.retrieve_table(table_name=modality)
    mappings.replace({np.nan: ""}, inplace=True)
    return mappings.to_dict()


@app.get("/cohorts/metadata", tags=["cohorts"])
def get_metadata():
    """
    Get all features of a modality.
    """
    metadata = database.retrieve_table("metadata")
    metadata.set_index("Cohort", inplace=True)
    return metadata.to_dict(orient="index")


@app.post("/visualization/chords/", tags=["visualization"])
def get_chords(request: ChordsRequest):
    """
    Generates links between mappings to visualize with chord diagram.
    """
    modality = request.modality
    cohorts = request.cohorts
    data = generate_chords(modality, cohorts, repo=database)
    return data


@app.post("/studypicker/rank", tags=["studypicker"])
def get_ranked_cohorts(features: list[str]):
    """
    Ranks cohorts based on the availability of given features.
    """
    ranked_cohorts = rank_cohorts(features, repo=database)
    return ranked_cohorts.to_dict(orient="records")


@app.get("/autocompletion", tags=["autocompletion"])
def get_autocompletion(text: str):
    """
    Autocomplete user's query.
    """
    return autocomplete(text, repo=database)


@app.get("/database", tags=["database"])
async def table_names():
    """
    Get all table names.
    """
    tables = database.get_table_names()
    return tables


@app.post("/database/import", tags=["database"])
async def import_data(
    credentials: Annotated[HTTPBasicCredentials, Depends(authenticate_user)],
    file: UploadFile = File(...),
):
    """
    Import data from a ZIP file containing CSV files to the database.
    """
    # Check if the file is a zip file
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(
            status_code=400, detail="Invalid file type. Only .zip files are accepted."
        )

    # Read the zip file
    contents = await file.read()
    with zipfile.ZipFile(io.BytesIO(contents)) as z:
        # Iterate over each file in the zip
        for filename in z.namelist():
            if filename.endswith(".csv"):
                # Read the CSV file
                with z.open(filename) as csv_file:
                    # Read the CSV content into a pandas DataFrame
                    csv_data = csv_file.read()

                table_name = filename[:-4]  # Remove the .csv extension

                # Process the DataFrame

                if (
                    filename.startswith("longitudinal_")
                    or filename.startswith("biomarkers_")
                    or filename.startswith("metadata")
                ):
                    database.store_upload(csv_data, table_name)

                else:
                    database.update_cdm_upload(csv_data, table_name)
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid file type in ZIP. Only CSV files are accepted.",
                )
    return {"message": "Data imported successfully!"}


@app.delete("/database/delete", tags=["database"])
def delete_database(
    credentials: Annotated[HTTPBasicCredentials, Depends(authenticate_user)],
):
    """
    Delete all tables from the database.
    """
    database.delete_database()
    return {"message": "All tables deleted successfully!"}


@app.delete("/database/delete/{table_name}", tags=["database"])
def delete_table(
    table_name: str,
    credentials: Annotated[HTTPBasicCredentials, Depends(authenticate_user)],
):
    """
    Delete a table from the database.
    """
    if table_name not in database.get_table_names():
        raise HTTPException(status_code=404, detail="Table not found.")
    database.delete_table(table_name)
    return {"message": "Table deleted successfully!"}
