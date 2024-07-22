import os
from hashlib import sha256

from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials

security = HTTPBasic()


def init_credentials():
    """Initializes admin credentials from environment variables or a .env file.

    This function checks for the presence of the `PDATAVIEWER_ADMIN_USERNAME`and
    `PDATAVIEWER_ADMIN_PASSWORD`environment variables. If these variables are not found,
    it loads them from a .env file. After loading, it checks for the presence of the
    `PDATAVIEWER_ADMIN_USERNAME`and`PDATAVIEWER_ADMIN_PASSWORD`environment variables again.
    If the credentials are still missing after attempting to load from the .env file, an HTTP
    exception is raised.

    Raises:
        HTTPException: If the admin credentials are missing after attempting to load from the environment and .env file, an HTTP 500 Internal Server Error exception is raised.

    Returns:
        bool: Returns True if the admin credentials are successfully initialized.
    """
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
    """Authenticates a user based on the provided credentials.

    This function compares the provided credentials with the environment variables
    `PDATAVIEWER_ADMIN_USERNAME`and `PDATAVIEWER_ADMIN_PASSWORD`. If the credentials match,
    the user is authenticated successfully. Otherwise, an HTTP exception is raised.

    Args:
        credentials (HTTPBasicCredentials, optional): The credentials provided by the user. Defaults to Depends(security).

    Raises:
        HTTPException: If the provided username or password is incorrect, an HTTP 401 Unauthorized exception is raised.

    Returns:
        bool: Returns True if the authentication is successful.
    """
    username = os.getenv("PDATAVIEWER_ADMIN_USERNAME")
    password = os.getenv("PDATAVIEWER_ADMIN_PASSWORD")
    hashed_password = sha256(credentials.password.encode("utf-8")).hexdigest()
    if credentials.username != username or hashed_password != password:
        raise HTTPException(status_code=401, detail="Incorrect credentials")
    else:
        return True
