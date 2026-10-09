from sqlalchemy import Boolean, String, Text, false
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ProblemBank(Base):
    """One LeetCode problem. The slug is the unique key used to join everything."""

    __tablename__ = "problem_bank"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    link: Mapped[str] = mapped_column(String(500))
    topic: Mapped[str | None] = mapped_column(String(100))
    pattern: Mapped[str] = mapped_column(String(50))
    difficulty: Mapped[str] = mapped_column(String(10))
    companies: Mapped[str | None] = mapped_column(Text)  # comma-separated, e.g. "Amazon, Google"
    sources: Mapped[str | None] = mapped_column(Text)  # comma-separated, e.g. "Blind 75, NeetCode 150"
    is_design: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    real_life: Mapped[str | None] = mapped_column(Text)
