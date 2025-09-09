import io
import zipfile
from typing import Annotated

from database.postgresql import PostgreSQLRepository
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.security import HTTPBasicCredentials

from api.dependencies import authenticate_user, get_client
from api.model import UploadType

router = APIRouter(prefix="/database", tags=["database"], dependencies=[Depends(get_client)])


@router.post(
    "/import",
    description="Import data from a ZIP file containing CSV files to the database.",
)
async def import_data(
    credentials: Annotated[HTTPBasicCredentials, Depends(authenticate_user)],
    database: Annotated[PostgreSQLRepository, Depends(get_client)],
    upload_type: UploadType,
    file: UploadFile = File(...),
):
    # Check if the file is a zip file
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only .zip files are accepted.")

    contents = await file.read()
    with zipfile.ZipFile(io.BytesIO(contents)) as z:
        for filename in z.namelist():
            if not filename.endswith(".csv"):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid file type in ZIP. Only CSV files are accepted.",
                )

            with z.open(filename) as csv_file:
                csv_data = csv_file.read()

            file_name = filename[:-4]  # Remove the .csv extension

            # Route based on the user's chosen upload_type
            if upload_type == UploadType.LONGITUDINAL:
                database.import_longitudinal_measurements(csv_data, file_name)

            elif upload_type == UploadType.BIOMARKERS:
                database.import_biomarker_measurements(csv_data, file_name)

            elif upload_type == UploadType.METADATA:
                database.import_metadata(csv_data)

            elif upload_type == UploadType.CDM:
                database.import_cdm(csv_data, modality=file_name)
    return {"message": "Data imported successfully!"}


@router.delete("/delete", description="Delete all tables from the database.")
def delete_database(
    credentials: Annotated[HTTPBasicCredentials, Depends(authenticate_user)],
    database: Annotated[PostgreSQLRepository, Depends(get_client)],
):
    database.clear_all()
    return {"message": "All tables deleted successfully!"}
