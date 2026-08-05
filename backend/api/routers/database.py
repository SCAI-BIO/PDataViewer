from typing import Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncEngine

from api.dependencies import get_current_user_payload, get_database_engine
from api.schemas import MessageResponse, UploadType
from api.services.imports import ImportValidationError, prepare_import
from api.tasks.import_tasks import process_import_background
from database.administration import recreate_database_schema

router = APIRouter(prefix="/database", tags=["database"], dependencies=[Depends(get_current_user_payload)])


@router.post(
    "/import",
    description="Import data from a ZIP or CSV file into the database.",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def import_data(
    background_tasks: BackgroundTasks, upload_type: UploadType, file: Annotated[UploadFile, File()]
) -> MessageResponse:
    """Validate an uploaded file and schedule its import"""
    try:
        contents = await file.read()
    finally:
        await file.close()

    try:
        prepared_import = prepare_import(filename=file.filename or "", contents=contents, upload_type=upload_type)
    except ImportValidationError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    background_tasks.add_task(
        process_import_background, prepared_import.contents, prepared_import.filename, prepared_import.upload_type
    )
    return MessageResponse(message=f"Import of {prepared_import.upload_type.value} started in the background.")


@router.delete("/delete", description="Delete and recreate all database tables.", response_model=MessageResponse)
async def delete_database(engine: Annotated[AsyncEngine, Depends(get_database_engine)]) -> MessageResponse:
    await recreate_database_schema(engine)
    return MessageResponse(message="All database tables were recreated successfully.")
