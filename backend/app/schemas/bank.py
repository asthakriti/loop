from pydantic import BaseModel, ConfigDict, field_validator


class ProblemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    link: str
    topic: str | None
    pattern: str
    difficulty: str
    companies: list[str]
    sources: list[str]
    is_design: bool
    is_custom: bool
    real_life: str | None
    solved: bool = False

    @field_validator("companies", "sources", mode="before")
    @classmethod
    def split_commas(cls, value):
        """The database stores "Amazon, Google". The API returns ["Amazon", "Google"]."""
        if value is None:
            return []
        if isinstance(value, str):
            return [part.strip() for part in value.split(",") if part.strip()]
        return value


class ProblemPage(BaseModel):
    items: list[ProblemOut]
    total: int
    page: int
    page_size: int
