from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserSettings(Base):
    """Per-user settings. Named UserSettings so it does not clash with app.config.settings."""

    __tablename__ = "settings"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    round_days: Mapped[int] = mapped_column(Integer, default=30, server_default="30")
    max_daily: Mapped[int] = mapped_column(Integer, default=10, server_default="10")
    new_per_day: Mapped[int] = mapped_column(Integer, default=2, server_default="2")
    target_company: Mapped[str | None] = mapped_column(String(100))
