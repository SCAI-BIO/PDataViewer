from functools import cache
from urllib.parse import urlsplit

from pydantic import AnyHttpUrl, Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


def _validate_http_url(value: str, *, field_name: str, allow_path: bool) -> AnyHttpUrl:
    """Validate an absolute HTTP URL before applying URL normalization."""
    if "\\" in value or any(
        character.isspace() or ord(character) < 32 or ord(character) == 127 for character in value
    ):
        raise ValueError(f"{field_name} cannot contain whitespace, control characters, or backslashes")

    parsed_url = urlsplit(value)

    if parsed_url.scheme not in {"http", "https"} or not parsed_url.hostname:
        raise ValueError(f"{field_name} must be an absolute HTTP or HTTPS URL with a host")

    if parsed_url.username is not None or parsed_url.password is not None:
        raise ValueError(f"{field_name} cannot contain URL credentials")

    if "?" in value or "#" in value:
        raise ValueError(f"{field_name} cannot contain a query string or fragment")

    if not allow_path and parsed_url.path not in {"", "/"}:
        raise ValueError(f"{field_name} must contain only the scheme, host, and optional port")

    # Validate the host and port as well as the URL structure.
    return AnyHttpUrl(value)


class Settings(BaseSettings):
    """Environment-dependent application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        validate_by_name=True,
        validate_by_alias=True,
    )

    postgres_user: str = Field(default="testuser", validation_alias="POSTGRES_USER")
    postgres_password: SecretStr = Field(default=SecretStr("testpass"), validation_alias="POSTGRES_PASSWORD")
    postgres_host: str = Field(default="localhost", validation_alias="POSTGRES_HOST")
    postgres_port: int = Field(default=5432, ge=1, le=65535, validation_alias="POSTGRES_PORT")
    postgres_db: str = Field(default="testdb", validation_alias="POSTGRES_DB")
    keycloak_url: str = Field(default="http://localhost:8080", validation_alias="KEYCLOAK_URL")
    keycloak_realm: str = Field(default="myrealm", validation_alias="KEYCLOAK_REALM")
    keycloak_client_id: str = Field(default="pdataviewer-api", validation_alias="KEYCLOAK_CLIENT_ID")
    allowed_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:4200"], validation_alias="ALLOWED_ORIGINS"
    )

    @field_validator("postgres_user", "postgres_host", "postgres_db", "keycloak_realm", "keycloak_client_id")
    @classmethod
    def validate_non_empty_string(cls, value: str) -> str:
        """Strip string settings and reject empty values."""
        stripped_value = value.strip()

        if not stripped_value:
            raise ValueError("Setting cannot be empty")

        return stripped_value

    @field_validator("keycloak_url")
    @classmethod
    def normalize_keycloak_url(cls, value: str) -> str:
        """Validate the Keycloak base URL, retaining any deployment context path."""
        normalized_url = value.strip().rstrip("/")
        _validate_http_url(normalized_url, field_name="KEYCLOAK_URL", allow_path=True)

        # Preserve the configured spelling because JWT issuer matching is exact.
        return normalized_url

    @field_validator("allowed_origins")
    @classmethod
    def validate_allowed_origins(cls, origins: list[str]) -> list[str]:
        """Validate, normalize, and deduplicate the configured CORS origins."""
        if not origins:
            raise ValueError("ALLOWED_ORIGINS must contain at least one origin")

        normalized_origins: list[str] = []
        seen_origins: set[str] = set()

        for origin in origins:
            stripped_origin = origin.strip()

            if stripped_origin == "*":
                raise ValueError("ALLOWED_ORIGINS cannot contain '*' while CORS credentials are enabled")

            parsed_origin = _validate_http_url(stripped_origin, field_name="ALLOWED_ORIGINS", allow_path=False)
            normalized_origin = str(parsed_origin).rstrip("/")

            if normalized_origin not in seen_origins:
                seen_origins.add(normalized_origin)
                normalized_origins.append(normalized_origin)

        return normalized_origins

    @property
    def database_url(self) -> URL:
        """Return the SQLAlchemy PostgreSQL connection URL."""
        return URL.create(
            drivername="postgresql+psycopg",
            username=self.postgres_user,
            password=self.postgres_password.get_secret_value(),
            host=self.postgres_host,
            port=self.postgres_port,
            database=self.postgres_db,
        )

    @property
    def keycloak_issuer(self) -> str:
        """Return the configured Keycloak issuer URL."""
        return f"{self.keycloak_url}/realms/{self.keycloak_realm}"

    @property
    def keycloak_certs_url(self) -> str:
        """Return the Keycloak JSON Web Key Set URL."""
        return f"{self.keycloak_issuer}/protocol/openid-connect/certs"


@cache
def get_settings() -> Settings:
    """Create and cache application settings."""
    return Settings()


settings = get_settings()

# PostgreSQL
DATABASE_URL = settings.database_url

# Temporary compatibility string for existing imports.
CONNECTION_STRING = DATABASE_URL.render_as_string(hide_password=False)

# Keycloak authentication
KEYCLOAK_URL = settings.keycloak_url
KEYCLOAK_REALM = settings.keycloak_realm
KEYCLOAK_CLIENT_ID = settings.keycloak_client_id
KEYCLOAK_ISSUER = settings.keycloak_issuer
KEYCLOAK_CERTS_URL = settings.keycloak_certs_url

# Application metadata
ALLOWED_ORIGINS = settings.allowed_origins
APP_VERSION = "0.0.3"  # This string will be replaced by CI
APP_TITLE = "PDATAVIEWER API"
APP_DESCRIPTION = "API interface to access programmatic functionalities of PDATAVIEWER"
CONTACT_INFO = {"name": "Dr. Marc Jacobs", "email": "marc.jacobs@scai.fraunhofer.de"}
LICENSE_INFO = {"name": "Apache 2.0", "url": "https://www.apache.org/licenses/LICENSE-2.0.html"}

# Swagger UI configuration
SWAGGER_UI_OAUTH_CONFIG = {
    "clientId": KEYCLOAK_CLIENT_ID,
    "appName": APP_TITLE,
    "usePkceWithAuthorizationCodeGrant": True,
}
