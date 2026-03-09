import os
from typing import Annotated

from database.postgresql import PostgreSQLRepository
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

POSTGRES_USER = os.getenv("POSTGRES_USER", "testuser")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "testpass")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "testdb")

connection_string = (
    f"postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)
engine = create_async_engine(
    connection_string, pool_size=10, max_overflow=20, pool_timeout=30, pool_pre_ping=True, pool_recycle=1800
)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)
security = HTTPBasic()


async def get_client():
    session = AsyncSessionLocal()
    async with PostgreSQLRepository(session=session, engine=engine) as client:
        yield client


async def authenticate_user(
    credentials: Annotated[HTTPBasicCredentials, Depends(security)],
    db: Annotated[PostgreSQLRepository, Depends(get_client)],
):
    try:
        await db.get_user(credentials.username, credentials.password)
    except ValueError:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    return True
