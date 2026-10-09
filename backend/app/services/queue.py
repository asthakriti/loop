"""Round robin revision queue.

Idea: every solved problem waits in one line. Each day we take a few from the
front of the line. When you revise one, its last_revised_on becomes today, so it
moves to the back of the line by itself. With N problems and a round of D days,
taking ceil(N / D) per day means every problem comes back about once every D days.
"""

import math
from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Revision, UserProblem
from app.services.xp import XP_PER_SECTION

TOO_MANY_WARNING = "Too many problems today. Make the round longer or retire easy problems."


class AlreadyDoneToday(Exception):
    pass


class RetiredProblem(Exception):
    pass


@dataclass
class TodayPlan:
    warmup: list[UserProblem]
    loop: list[UserProblem]
    done_today: dict[int, Revision]  # user_problem_id -> today's revision
    daily_count: int
    warning: str | None


def daily_count(queue_size: int, round_days: int) -> int:
    """How many line problems to revise per day: ceil(problems / round days).

    Example: 164 problems, 30 day round -> ceil(5.47) = 6 per day.
    """
    return math.ceil(queue_size / round_days)


def todays_revisions(db: Session, user_id: int, today: date) -> dict[int, Revision]:
    rows = db.scalars(
        select(Revision)
        .join(UserProblem, Revision.user_problem_id == UserProblem.id)
        .where(UserProblem.user_id == user_id, Revision.revised_on == today)
    )
    return {r.user_problem_id: r for r in rows}


def build_today(db: Session, user_id: int, today: date, round_days: int, max_daily: int) -> TodayPlan:
    """Build today's Warm-up and Loop lists.

    Problems cleared today stay in the list (marked done), so the list does not
    change during the day and no extra problem slides in after you clear one.
    """
    done_today = todays_revisions(db, user_id, today)
    done_ids = {section: set() for section in XP_PER_SECTION}
    for up_id, revision in done_today.items():
        done_ids[revision.section].add(up_id)

    mine = select(UserProblem).where(UserProblem.user_id == user_id)

    # ---- Warm-up: solved before today and not revised yet (status "new"),
    # plus the ones already warmed up today.
    warmup = db.scalars(
        mine.where(
            ((UserProblem.status == "new") & (UserProblem.solved_on < today))
            | UserProblem.id.in_(done_ids["warmup"])
        ).order_by(UserProblem.solved_on, UserProblem.id)
    ).all()

    # ---- Daily count. A warm-up cleared today has just joined the line;
    # we do not count it, so today's number does not grow while you work.
    in_queue = db.scalars(mine.where(UserProblem.status == "in_queue")).all()
    queue_size = sum(1 for up in in_queue if up.id not in done_ids["warmup"])
    count = daily_count(queue_size, round_days)

    # ---- The Loop: first the ones already cleared from the loop today ...
    loop_done = sorted(
        (up for up in in_queue if up.id in done_ids["loop"]), key=lambda up: up.id
    )
    # ... then the front of the line: never revised (NULL) first, then oldest date, then id.
    # Anything revised today is already at the back, so it is skipped.
    remaining = max(count - len(loop_done), 0)
    loop_pending = db.scalars(
        mine.where(
            UserProblem.status == "in_queue",
            (UserProblem.last_revised_on.is_(None)) | (UserProblem.last_revised_on < today),
        )
        .order_by(UserProblem.last_revised_on.asc().nulls_first(), UserProblem.id)
        .limit(remaining)
    ).all()

    warning = TOO_MANY_WARNING if count > max_daily else None
    return TodayPlan(
        warmup=list(warmup),
        loop=loop_done + list(loop_pending),
        done_today=done_today,
        daily_count=count,
        warning=warning,
    )


def mark_done(db: Session, up: UserProblem, section: str, today: date) -> Revision:
    """Record one revision. The problem moves to the back of the line,
    because its last_revised_on is now the newest date."""
    if up.status == "retired":
        raise RetiredProblem()
    if up.last_revised_on == today:
        raise AlreadyDoneToday()

    up.last_revised_on = today
    up.times_revised += 1
    # After its warm-up, a new problem joins the line.
    # "Solved it" on a new quest (section "new") keeps it as "new",
    # so it still shows in Warm-up tomorrow.
    if up.status == "new" and section != "new":
        up.status = "in_queue"

    revision = Revision(
        user_problem_id=up.id, revised_on=today, section=section, xp_earned=XP_PER_SECTION[section]
    )
    db.add(revision)
    db.commit()
    return revision


def retire(db: Session, up: UserProblem) -> None:
    """Take a problem out of the loop for good."""
    up.status = "retired"
    db.commit()
