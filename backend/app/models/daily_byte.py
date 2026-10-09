from sqlalchemy import CheckConstraint, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DailyByte(Base):
    """A short code snippet or DSA fact shown on the Today page."""

    __tablename__ = "daily_bytes"
    __table_args__ = (CheckConstraint("type IN ('code', 'fact')", name="ck_daily_byte_type"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(String(10))
    title: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    why_it_matters: Mapped[str] = mapped_column(Text)
    topic: Mapped[str | None] = mapped_column(String(50))
