from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings. Values come from the .env file or environment variables."""

    database_url: str = "postgresql+psycopg://loop:loop@localhost:5433/loop"
    jwt_secret: str = "change-me"
    jwt_expire_minutes: int = 60
    # Frontend address(es) allowed to call the API, comma-separated.
    cors_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
