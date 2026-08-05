from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from api.config import (
    APP_DESCRIPTION,
    APP_TITLE,
    APP_VERSION,
    CONTACT_INFO,
    LICENSE_INFO,
    SWAGGER_UI_OAUTH_CONFIG,
)
from api.dependencies import dispose_engine, engine
from api.routers import biomarkers, cdm, cohorts, longitudinal, stupdypicker, visualization
from api.routers import database as database_router
from database.models import Base

ALLOWED_ORIGINS = [
    "https://pdata.scai.fraunhofer.de",
    "http://localhost:4200",
]


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Initialize database tables and dispose of the engine on shutdown"""
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    try:
        yield
    finally:
        await dispose_engine()


app = FastAPI(
    title=APP_TITLE,
    lifespan=lifespan,
    description=APP_DESCRIPTION,
    version=APP_VERSION,
    terms_of_service="https://www.scai.fraunhofer.de",
    contact=CONTACT_INFO,
    license_info=LICENSE_INFO,
    swagger_ui_init_oauth=SWAGGER_UI_OAUTH_CONFIG,
)

app.add_middleware(
    CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)


@app.get("/version", tags=["info"], description="Current API version.", response_model=str)
def get_current_version() -> str:
    return APP_VERSION


app.include_router(biomarkers.router)
app.include_router(longitudinal.router)
app.include_router(cdm.router)
app.include_router(cohorts.router)
app.include_router(visualization.router)
app.include_router(stupdypicker.router)
app.include_router(database_router.router)


@app.get("/", include_in_schema=False, response_class=RedirectResponse)
def swagger_redirect() -> RedirectResponse:
    """Redirect the application root to the Swagger documentation"""
    return RedirectResponse(url="/docs")
