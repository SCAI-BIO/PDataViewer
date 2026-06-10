from contextlib import asynccontextmanager

from database.models import Base
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from starlette.middleware.cors import CORSMiddleware

from api.config import (
    APP_DESCRIPTION,
    APP_TITLE,
    APP_VERSION,
    CONTACT_INFO,
    LICENSE_INFO,
    SWAGGER_UI_OAUTH_CONFIG,
)
from api.dependencies import engine
from api.routers import (
    biomarkers,
    cdm,
    cohorts,
    database,
    longitudinal,
    stupdypicker,
    visualization,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


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

origins = ["https://pdata.scai.fraunhofer.de", "http://localhost:4200"]

app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)


@app.get("/version", tags=["info"], description="Current API version.")
def get_current_version():
    return app.version


app.include_router(biomarkers.router)
app.include_router(longitudinal.router)
app.include_router(cdm.router)
app.include_router(cohorts.router)
app.include_router(visualization.router)
app.include_router(stupdypicker.router)
app.include_router(database.router)


@app.get("/", include_in_schema=False)
def swagger_redirect():
    return RedirectResponse(url="/docs")
