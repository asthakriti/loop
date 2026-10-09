from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings. Values come from the .env file or environment variables."""

    database_url: str = "postgresql://loop:loop@localhost:5432/loop"
    jwt_secret: str = "change-me"
    jwt_expire_minutes: int = 60

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
