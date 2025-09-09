import os
from typing import Annotated

from database.postgresql import PostgreSQLRepository
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials

POSTGRES_USER = os.getenv("POSTGRES_USER", "testuser")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "testpass")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "testdb")

connection_string = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
security = HTTPBasic()


async def get_client():
    with PostgreSQLRepository(connection_string) as client:
        yield client


def authenticate_user(
    credentials: Annotated[HTTPBasicCredentials, Depends(security)],
    db: Annotated[PostgreSQLRepository, Depends(get_client)],
):
    try:
        db.get_user(credentials.username, credentials.password)
    except ValueError:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    return True
