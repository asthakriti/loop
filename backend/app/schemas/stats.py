from typing import Literal

from pydantic import BaseModel

from app.schemas.today import SuggestionOut


class PatternOut(BaseModel):
    pattern: str
    solved: int
    total: int  # problems with this pattern in the bank
    status: Literal["covered", "in progress", "not started"]
    next: SuggestionOut | None  # best unsolved problem in this pattern


class PatternCount(BaseModel):
    pattern: str
    solved: int


class RoundOut(BaseModel):
    number: int
    revised: int  # loop revisions done in this round
    total: int  # problems in the line


class MilestoneOut(BaseModel):
    target: int  # next of 100, 200, 300 ...
    to_go: int


class StatsOut(BaseModel):
    total_solved: int
    solved_per_pattern: list[PatternCount]
    round: RoundOut
    milestone: MilestoneOut
