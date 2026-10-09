from datetime import date

from sqlalchemy import Date, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserStats(Base):
    __tablename__ = "user_stats"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    total_xp: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    current_streak: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    best_streak: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    last_streak_day: Mapped[date | None] = mapped_column(Date)
