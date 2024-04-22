from dotenv import load_dotenv
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import os

security = HTTPBasic()


def init_credentials():
    admin_username = os.getenv("PDATAVIEWER_ADMIN_USERNAME")
    admin_password = os.getenv("PDATAVIEWER_ADMIN_PASSWORD")

    if not admin_username or not admin_password:
        load_dotenv()
    if os.getenv("PDATAVIEWER_ADMIN_USERNAME") and os.getenv(
        "PDATAVIEWER_ADMIN_PASSWORD"
    ):
        return True
    else:
        raise HTTPException(status_code=500, detail="Missing admin credentials")


def authenticate_user(credentials: HTTPBasicCredentials = Depends(security)):
    username = os.getenv("PDATAVIEWER_ADMIN_USERNAME")
    password = os.getenv("PDATAVIEWER_ADMIN_PASSWORD")
    if credentials.username != username or credentials.password != password:
        raise HTTPException(status_code=401, detail="Incorrect credentials")
