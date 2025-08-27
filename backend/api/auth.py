import os

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials

security = HTTPBasic()
ph = PasswordHasher()


def init_credentials():
    """Initializes admin credentials from environment variables or a .env file.

    This function attempts to load the admin username and password from the environment
    variables `PDATAVIEWER_ADMIN_USERNAME`and `PDATAVIEWER_ADMIN_PASSWORD`. If these values
    are not found, it loads them from a `.env` file using `dotenv`. After attempting to load
    the credentials, it checks if they are set in the environment. If not, an HTTP exception is raise.

    Raises:
        HTTPException: If the admin credentials are missing after loading from the environment
            and `.env` file, a 500 Internal Server Error is raised with a message indicating
            missing credentials.

    Returns:
        bool: Returns `True` if the admin credentials are successfully initialized.
    """
    load_dotenv()

    # Check the admin username and password is already set in the environment
    admin_username = os.getenv("PDATAVIEWER_ADMIN_USERNAME")
    admin_password = os.getenv("PDATAVIEWER_ADMIN_PASSWORD")

    if not admin_username or not admin_password:
        raise HTTPException(status_code=500, detail="Missing admin credentials")

    # Detect if password is already a hash (argon2 hashes always start with "$argon2")
    if not admin_password.startswith("$argon2"):
        # Hash the plaintext password
        hashed = ph.hash(admin_password)
        os.environ["PDATAVIEWER_ADMIN_PASSWORD"] = hashed

    return True


def authenticate_user(credentials: HTTPBasicCredentials = Depends(security)):
    """Authenticates a user based on the provided HTTP Basic credentials.

    This function checks the username and password provided by the user against the
    admin credentials stored in teh environment variables `PDATAVIEWER_ADMIN_USERNAME`
    and `PDATAVIEWER_ADMIN_PASSWORD`. If the provided username and password match,
    the user is authenticated successfully. If either the username or password is incorrect,
    an HTTP 401 Unauthorized exception is raised.

    Args:
        credentials (HTTPBasicCredentials, optional): The HTTP Basic credentials provided
            by the user (username and password). Defaults to Depends(security).

    Raises:
        HTTPException: If the username or password is incorrect, an HTTP 401 Unauthorized
            exception is raised with an appropriate detail message.

    Returns:
        bool: Returns `True` if the user is authenticated successfully. If authentication fails,
            an exception is raised before this return.
    """

    # Get the username and password from the environment
    username = os.getenv("PDATAVIEWER_ADMIN_USERNAME")
    password = os.getenv("PDATAVIEWER_ADMIN_PASSWORD")

    # If they are not set, raise exception
    if username is None or password is None:
        raise HTTPException(status_code=500, detail="Admin credentials are not configured")

    # Check if the user supplied username is correct
    if credentials.username != username:
        raise HTTPException(status_code=401, detail="Incorrect username")

    # Check if the user supplied password is correct
    try:
        ph.verify(password, credentials.password)
    except VerifyMismatchError:
        raise HTTPException(status_code=401, detail="Incorrect password")

    return True
