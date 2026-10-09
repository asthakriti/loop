from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings. Values come from the .env file or environment variables."""

    database_url: str = "postgresql+psycopg://loop:loop@localhost:5433/loop"
    jwt_secret: str = "change-me"
    jwt_expire_minutes: int = 60
    # Frontend address(es) allowed to call the API, comma-separated.
    cors_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, url: str) -> str:
        """Hosts like Render give "postgresql://..." or "postgres://...".
        SQLAlchemy needs the driver name, so turn it into "postgresql+psycopg://..."."""
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url


settings = Settings()
