from datetime import date
from typing import Literal

from pydantic import BaseModel

Section = Literal["warmup", "loop", "new"]


class TodayItem(BaseModel):
    id: int  # user_problem id, used for /my/problems/{id}/done
    title: str
    link: str
    pattern: str
    difficulty: str
    notes: str | None
    real_life: str | None
    last_revised_on: date | None
    done_today: bool
    xp: int


class SuggestionOut(BaseModel):
    slug: str
    title: str
    link: str
    pattern: str
    difficulty: str
    real_life: str | None
    score: int  # raw score, max 15
    priority: int  # score scaled to 1-10
    reasons: list[str]


class NewQuestItem(SuggestionOut):
    id: int | None  # user_problem id once solved, None before
    done_today: bool
    xp: int


class TodayOut(BaseModel):
    warmup: list[TodayItem]
    loop: list[TodayItem]
    new: list[NewQuestItem]
    daily_count: int
    warning: str | None
    done_count: int
    total_count: int
    xp_today: int


class DoneIn(BaseModel):
    section: Section


class DoneOut(BaseModel):
    xp_earned: int
    total_xp: int
    level: int
    level_name: str
    streak: int
    all_done: bool  # True when every quest of today is cleared
