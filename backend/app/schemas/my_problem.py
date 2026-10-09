from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator

Difficulty = Literal["Easy", "Medium", "Hard"]
Status = Literal["new", "in_queue", "retired"]


class MyProblemCreate(BaseModel):
    """Send either {slug} for a bank problem, or {title, link, difficulty, pattern} for a custom one."""

    slug: str | None = None
    title: str | None = Field(None, max_length=255)
    link: str | None = Field(None, max_length=500)
    difficulty: Difficulty | None = None
    pattern: str | None = Field(None, max_length=50)

    @model_validator(mode="after")
    def slug_or_custom_fields(self):
        is_custom = all([self.title, self.link, self.difficulty, self.pattern])
        if not self.slug and not is_custom:
            raise ValueError("Send a slug, or title + link + difficulty + pattern")
        return self


class MyProblemUpdate(BaseModel):
    notes: str | None = Field(None, max_length=500)


class MyProblemOut(BaseModel):
    id: int
    problem_id: int
    slug: str
    title: str
    link: str
    pattern: str
    difficulty: str
    is_custom: bool
    real_life: str | None
    status: Status
    solved_on: date
    last_revised_on: date | None
    times_revised: int
    notes: str | None


class ImportResult(BaseModel):
    created: int
    skipped: int
    custom_created: int
    missing: list[str]
