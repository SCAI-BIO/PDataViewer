import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from starlette.middleware.cors import CORSMiddleware

from api.auth import init_credentials
from api.routers import (
    autocompletion,
    biomarkers,
    cdm,
    cohorts,
    database,
    longitudinal,
    stupdypicker,
    visualization,
)

load_dotenv()

resources = {}
logger = logging.getLogger("uvicorn.info")


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


@app.get("/", include_in_schema=False)
def swagger_redirect():
    return RedirectResponse(url="/docs")


@app.get("/version", tags=["info"], description="Current API version.")
def get_current_version():
    return app.version


app.include_router(biomarkers.router)
app.include_router(longitudinal.router)
app.include_router(cdm.router)
app.include_router(cohorts.router)
app.include_router(visualization.router)
app.include_router(stupdypicker.router)
app.include_router(autocompletion.router)
app.include_router(database.router)
