import io
import zipfile
from typing import Annotated

from database.postgresql import PostgreSQLRepository
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.security import HTTPBasicCredentials

from api.dependencies import authenticate_user, get_client
from api.model import UploadType

router = APIRouter(prefix="/database", tags=["database"], dependencies=[Depends(get_client)])


@router.post("/import", description="Import data from a ZIP or CSV file into the database.")
async def import_data(
    credentials: Annotated[HTTPBasicCredentials, Depends(authenticate_user)],
    database: Annotated[PostgreSQLRepository, Depends(get_client)],
    upload_type: UploadType,
    file: UploadFile = File(...),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    contents = await file.read()

    # --- Case 1: ZIP file with multiple CSVs ---
    if file.filename.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(contents)) as z:
            for filename in z.namelist():
                if not filename.endswith(".csv"):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid file in ZIP: {filename}. Only CSV files are allowed.",
                    )

                with z.open(filename) as csv_file:
                    csv_data = csv_file.read()

                file_name = filename[:-4]  # strip ".csv"

                if upload_type == UploadType.LONGITUDINAL:
                    database.import_longitudinal_measurements(csv_data, file_name)

                elif upload_type == UploadType.BIOMARKERS:
                    database.import_biomarker_measurements(csv_data, file_name)

                elif upload_type == UploadType.METADATA:
                    database.import_metadata(csv_data)

                elif upload_type == UploadType.CDM:
                    database.import_cdm(csv_data, modality=file_name)

    # --- Case 2: Single CSV file ---
    elif file.filename.endswith(".csv"):
        file_name = file.filename[:-4]

        if upload_type == UploadType.LONGITUDINAL:
            database.import_longitudinal_measurements(contents, file_name)

        elif upload_type == UploadType.BIOMARKERS:
            database.import_biomarker_measurements(contents, file_name)

        elif upload_type == UploadType.METADATA:
            database.import_metadata(contents)

        elif upload_type == UploadType.CDM:
            database.import_cdm(contents, modality=file_name)

    else:
        raise HTTPException(status_code=400, detail="Invalid file type. Only .zip or .csv files are accepted.")

    return {"message": f"{upload_type.value} data imported successfully!"}


@router.delete("/delete", description="Delete all tables from the database.")
def delete_database(
    credentials: Annotated[HTTPBasicCredentials, Depends(authenticate_user)],
    database: Annotated[PostgreSQLRepository, Depends(get_client)],
):
    database.clear_all()
    return {"message": "All tables deleted successfully!"}
