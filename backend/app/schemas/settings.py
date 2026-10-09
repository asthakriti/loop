from pydantic import BaseModel, ConfigDict, Field, field_validator


class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    round_days: int
    max_daily: int
    new_per_day: int
    target_company: str | None


class SettingsUpdate(BaseModel):
    """Send only the fields you want to change."""

    round_days: int | None = Field(None, ge=7, le=90)
    max_daily: int | None = Field(None, ge=1, le=30)
    new_per_day: int | None = Field(None, ge=0, le=5)
    target_company: str | None = Field(None, max_length=100)

    @field_validator("target_company")
    @classmethod
    def blank_means_none(cls, value):
        """An empty company ("" or spaces) clears the target company."""
        if value is None:
            return None
        return value.strip() or None
