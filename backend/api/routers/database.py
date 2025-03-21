import io
import zipfile
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.security import HTTPBasicCredentials
from repository.sqllite import SQLLiteRepository

from api.auth import authenticate_user
from api.dependencies import get_db

router = APIRouter(
    prefix="/database", tags=["database"], dependencies=[Depends(get_db)]
)


@router.get("/", description="Get all table names.")
async def table_names(database: Annotated[SQLLiteRepository, Depends(get_db)]):
    tables = database.get_table_names()
    return tables


@router.post(
    "/import",
    description="Import data from a ZIP file containing CSV files to the database.",
)
async def import_data(
    credentials: Annotated[HTTPBasicCredentials, Depends(authenticate_user)],
    database: Annotated[SQLLiteRepository, Depends(get_db)],
    file: UploadFile = File(...),
):
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


@router.delete("/delete", description="Delete all tables from the database.")
def delete_database(
    credentials: Annotated[HTTPBasicCredentials, Depends(authenticate_user)],
    database: Annotated[SQLLiteRepository, Depends(get_db)],
):
    database.delete_database()
    return {"message": "All tables deleted successfully!"}


@router.delete("/delete/{table_name}", description="Delete a table from the database.")
def delete_table(
    table_name: str,
    credentials: Annotated[HTTPBasicCredentials, Depends(authenticate_user)],
    database: Annotated[SQLLiteRepository, Depends(get_db)],
):
    if table_name not in database.get_table_names():
        raise HTTPException(status_code=404, detail="Table not found.")
    database.delete_table(table_name)
    return {"message": "Table deleted successfully!"}
