from datetime import date

from pydantic import BaseModel


class WeekDay(BaseModel):
    day: date
    done: bool  # every quest cleared that day


class ProgressOut(BaseModel):
    total_xp: int
    level: int
    level_name: str
    level_xp: int  # XP where the current level starts (for the XP bar)
    next_level_xp: int | None  # None at the max level
    current_streak: int
    best_streak: int
    week: list[WeekDay]  # Monday to Sunday
