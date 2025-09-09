
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from starlette.middleware.cors import CORSMiddleware

from api.routers import (
    biomarkers,
    cdm,
    cohorts,
    database,
    longitudinal,
    stupdypicker,
    visualization,
)

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
)

origins = ["*"]

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


@app.get("v1", include_in_schema=False)
def v1_redirect():
    return RedirectResponse(url="/docs")
