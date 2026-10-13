import logging
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import PyJWKClient
from jwt.exceptions import PyJWTError

from pdataviewer.api.config import KEYCLOAK_CERTS_URL, KEYCLOAK_CLIENT_ID, KEYCLOAK_ISSUER

LOGGER = logging.getLogger(__name__)
JWT_ALGORITHM = "RS256"
ACCESS_TOKEN_TYPE = "Bearer"
JWKS_TIMEOUT_SECONDS = 5
JWKS_CACHE_SECONDS = 300

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=(f"{KEYCLOAK_ISSUER}/protocol/openid-connect/token"))
jwks_client = PyJWKClient(
    KEYCLOAK_CERTS_URL, cache_jwk_set=True, lifespan=JWKS_CACHE_SECONDS, cache_keys=False, timeout=JWKS_TIMEOUT_SECONDS
)


def _credentials_exception() -> HTTPException:
    """Create the standard invalid-credentials response."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user_payload(token: Annotated[str, Depends(oauth2_scheme)]) -> dict[str, Any]:
    """Validate a Keycloak access token and return its claims."""
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        return jwt.decode(
            token,
            signing_key.key,
            algorithms=[JWT_ALGORITHM],
            audience=KEYCLOAK_CLIENT_ID,
            options={"verify_iss": False, "require": ["exp", "aud"]},
        )
    except PyJWTError as error:
        raise _credentials_exception() from error
