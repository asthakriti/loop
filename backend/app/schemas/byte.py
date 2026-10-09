from typing import Literal

from pydantic import BaseModel, ConfigDict


class ByteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: Literal["code", "fact"]
    title: str
    content: str
    why_it_matters: str
    topic: str | None
