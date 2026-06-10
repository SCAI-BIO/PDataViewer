import os

from dotenv import load_dotenv

load_dotenv()

# PostgreSQL
POSTGRES_USER = os.getenv("POSTGRES_USER", "testuser")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "testpass")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "testdb")
CONNECTION_STRING = (
    f"postgresql+psycopg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

# Keycloak Auth
KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "myrealm")
KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID", "pdataviewer-api")
KEYCLOAK_ISSUER = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}"
KEYCLOAK_CERTS_URL = f"{KEYCLOAK_ISSUER}/protocol/openid-connect/certs"


# Application Metadata
APP_VERSION = "0.0.3"  # This string will be replaced by CI
APP_TITLE = "PDATAVIEWER API"
APP_DESCRIPTION = "API interface to access programmatic functionalities of PDATAVIEWER"

CONTACT_INFO = {
    "name": "Dr. Marc Jacobs",
    "email": "marc.jacobs@scai.fraunhofer.de",
}

LICENSE_INFO = {
    "name": "Apache 2.0",
    "url": "https://www.apache.org/licenses/LICENSE-2.0.html",
}

# Swagger UI Configuration
SWAGGER_UI_OAUTH_CONFIG = {
    "clientId": KEYCLOAK_CLIENT_ID,
    "appName": f"{APP_TITLE} API",
    "usePkceWithAuthorizationCodeGrant": True,
}
