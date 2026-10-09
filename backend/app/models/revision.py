from datetime import date

from sqlalchemy import CheckConstraint, Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Revision(Base):
    """One 'done' click: which problem, which day, which section, how much XP."""

    __tablename__ = "revisions"
    __table_args__ = (
        CheckConstraint("section IN ('warmup', 'loop', 'new')", name="ck_revision_section"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_problem_id: Mapped[int] = mapped_column(
        ForeignKey("user_problems.id", ondelete="CASCADE"), index=True
    )
    revised_on: Mapped[date] = mapped_column(Date)
    section: Mapped[str] = mapped_column(String(10))
    xp_earned: Mapped[int] = mapped_column(Integer)
