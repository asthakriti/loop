from datetime import date

from sqlalchemy import CheckConstraint, Date, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.problem_bank import ProblemBank


class UserProblem(Base):
    """A problem the user has solved, and where it is in the revision line.

    status:
      new      -> solved recently, waits in Warm-up
      in_queue -> part of the round robin line
      retired  -> never shown in the loop again
    """

    __tablename__ = "user_problems"
    __table_args__ = (
        UniqueConstraint("user_id", "problem_id", name="uq_user_problem"),
        CheckConstraint("status IN ('new', 'in_queue', 'retired')", name="ck_user_problem_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    problem_id: Mapped[int] = mapped_column(ForeignKey("problem_bank.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(20), default="new", server_default="new")
    solved_on: Mapped[date] = mapped_column(Date)
    last_revised_on: Mapped[date | None] = mapped_column(Date)  # NULL = never revised, so it goes first
    times_revised: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    notes: Mapped[str | None] = mapped_column(Text)

    # The bank problem (title, link, pattern ...). lazy="joined" loads it in the same query.
    problem: Mapped[ProblemBank] = relationship(lazy="joined")
