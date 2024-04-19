from fastapi import FastAPI

app = FastAPI(
    title="PDATAVIEWER API",
    description="API interface to access programmatic functionalities of PDATAVIEWER",
    version="0.0.0",
)


@app.get("/")
async def root():
    return {"message": "Hello World"}
