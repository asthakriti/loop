"""Badges. Rules are checked after every 'done'. Each badge unlocks only once."""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Badge, ProblemBank, UserBadge, UserProblem
from app.services.xp import get_stats


def earned_codes(db: Session, user_id: int) -> set[str]:
    """Which badge rules does the user meet right now?"""
    mine = select(func.count()).select_from(UserProblem).where(UserProblem.user_id == user_id)
    mine_in_bank = mine.join(ProblemBank, UserProblem.problem_id == ProblemBank.id)

    total = db.scalar(mine)
    in_queue = db.scalar(mine.where(UserProblem.status == "in_queue"))
    in_queue_never_revised = db.scalar(
        mine.where(UserProblem.status == "in_queue", UserProblem.times_revised == 0)
    )
    design = db.scalar(mine_in_bank.where(ProblemBank.is_design.is_(True)))
    graphs = db.scalar(mine_in_bank.where(ProblemBank.pattern == "Graphs"))
    best_streak = get_stats(db, user_id).best_streak

    rules = {
        "century": total >= 100,
        "double_century": total >= 200,
        # First full round: every problem in the line has been revised at least once.
        "full_circle": in_queue > 0 and in_queue_never_revised == 0,
        "builder": design > 0,
        "explorer": graphs > 0,
        "on_fire": best_streak >= 7,
        "unstoppable": best_streak >= 30,
    }
    return {code for code, met in rules.items() if met}


def check_badges(db: Session, user_id: int, today: date) -> list[Badge]:
    """Unlock any badge the user just earned. Returns only the NEW ones, so the UI can celebrate."""
    already = set(db.scalars(select(UserBadge.badge_id).where(UserBadge.user_id == user_id)))
    codes = earned_codes(db, user_id)
    if not codes:
        return []

    new_badges = [
        badge
        for badge in db.scalars(select(Badge).where(Badge.code.in_(codes)).order_by(Badge.id))
        if badge.id not in already
    ]
    for badge in new_badges:
        db.add(UserBadge(user_id=user_id, badge_id=badge.id, unlocked_on=today))
    db.commit()
    return new_badges


def all_badges(db: Session, user_id: int) -> list[tuple[Badge, date | None]]:
    """Every badge, with the date it was unlocked (None if still locked)."""
    unlocked = dict(
        db.execute(select(UserBadge.badge_id, UserBadge.unlocked_on).where(UserBadge.user_id == user_id)).all()
    )
    return [(badge, unlocked.get(badge.id)) for badge in db.scalars(select(Badge).order_by(Badge.id))]
