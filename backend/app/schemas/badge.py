from datetime import date

from pydantic import BaseModel, ConfigDict


class BadgeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    description: str


class BadgeStatusOut(BadgeOut):
    unlocked: bool
    unlocked_on: date | None
