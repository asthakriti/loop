"""Daily Byte: one code snippet or DSA fact per day.

Round robin again: day 0 shows byte 0, day 1 shows byte 1, ...
and after the last one it starts again from the first.
"""

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DailyByte

START_DATE = date(2026, 1, 1)


def byte_index(today: date, total: int) -> int:
    """Same index all day, the next one tomorrow."""
    return (today - START_DATE).days % total


def byte_for_today(db: Session, today: date, byte_type: str | None = None) -> DailyByte | None:
    query = select(DailyByte).order_by(DailyByte.id)
    if byte_type:
        query = query.where(DailyByte.type == byte_type)
    all_bytes = db.scalars(query).all()
    if not all_bytes:
        return None
    return all_bytes[byte_index(today, len(all_bytes))]
