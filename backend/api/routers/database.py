from typing import Annotated

from database.postgresql import PostgreSQLRepository
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile

from api.dependencies import get_client, get_current_user_payload
from api.model import UploadType
from api.tasks.import_tasks import process_import_background

router = APIRouter(prefix="/database", tags=["database"])


@router.post("/import", description="Import data from a ZIP or CSV file into the database.")
async def import_data(
    user: Annotated[dict, Depends(get_current_user_payload)],
    background_tasks: BackgroundTasks,
    upload_type: UploadType,
    file: UploadFile = File(...),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    contents = await file.read()

    is_zip = file.filename.endswith(".zip")
    is_csv = file.filename.endswith(".csv")

    if not (is_zip or is_csv):
        raise HTTPException(status_code=400, detail="Invalid file type. Only .zip or .csv files are accepted.")

    background_tasks.add_task(process_import_background, contents, file.filename, upload_type)
    return {"message": f"Import of {upload_type.value} started in the background."}


@router.delete("/delete", description="Delete all tables from the database.")
async def delete_database(
    user: Annotated[dict, Depends(get_current_user_payload)],
    database: Annotated[PostgreSQLRepository, Depends(get_client)],
):
    await database.clear_all()
    return {"message": "All tables deleted successfully!"}
