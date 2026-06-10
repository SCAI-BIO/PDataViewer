import jwt
from database.postgresql import PostgreSQLRepository
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import PyJWKClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from api.config import (
    CONNECTION_STRING,
    KEYCLOAK_CERTS_URL,
    KEYCLOAK_CLIENT_ID,
    KEYCLOAK_ISSUER,
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{KEYCLOAK_ISSUER}/protocol/openid-connect/token")
jwks_client = PyJWKClient(KEYCLOAK_CERTS_URL)


def get_current_user_payload(token: str = Depends(oauth2_scheme)) -> dict:
    """Validates the JWT signature and returns the decoded payload"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token, signing_key.key, algorithms=["RS256"], audience=KEYCLOAK_CLIENT_ID, options={"verify_iss": False}
        )
        return payload
    except jwt.exceptions.PyJWTError:
        raise credentials_exception


engine = create_async_engine(
    CONNECTION_STRING, pool_size=10, max_overflow=20, pool_timeout=30, pool_pre_ping=True, pool_recycle=1800
)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)


async def get_client():
    session = AsyncSessionLocal()
    async with PostgreSQLRepository(session=session, engine=engine) as client:
        yield client
