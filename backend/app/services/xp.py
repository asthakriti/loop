"""XP, levels and streaks."""

from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import StreakDay, UserStats

# XP for clearing one problem, by the section it was in.
XP_PER_SECTION = {
    "warmup": 10,
    "loop": 15,
    "new": 30,
}

# (level, total XP needed, name)
LEVELS = [
    (1, 0, "Beginner"),
    (2, 100, "Starter"),
    (3, 250, "Explorer"),
    (4, 450, "Builder"),
    (5, 700, "Problem Solver"),
    (6, 950, "Pattern Seeker"),
    (7, 1200, "Pattern Hunter"),
    (8, 1500, "Algorithm Ace"),
    (9, 1900, "Code Warrior"),
    (10, 2400, "Interview Ready"),
]


@dataclass
class LevelInfo:
    level: int
    name: str
    level_xp: int  # XP where this level starts
    next_level_xp: int | None  # XP where the next level starts (None at max level)


def level_for(total_xp: int) -> LevelInfo:
    """Find the highest level whose XP the user has reached."""
    current = LEVELS[0]
    for row in LEVELS:
        if total_xp >= row[1]:
            current = row
    level, level_xp, name = current
    next_xp = LEVELS[level][1] if level < len(LEVELS) else None  # LEVELS[level] is the next row
    return LevelInfo(level=level, name=name, level_xp=level_xp, next_level_xp=next_xp)


# ---------- streak ----------

def current_streak(stats: UserStats, today: date) -> int:
    """The streak to show. If the last streak day is older than yesterday,
    the user missed a day, so the streak is 0 (best_streak is kept)."""
    if stats.last_streak_day is None or stats.last_streak_day < today - timedelta(days=1):
        return 0
    return stats.current_streak


def count_streak_day(stats: UserStats, today: date) -> bool:
    """Call when every quest of the day is cleared.

    - already counted today      -> do nothing (only once per day)
    - last streak day = yesterday -> streak + 1
    - otherwise (first day, or missed a day) -> streak starts again at 1
    Returns True if today was newly counted.
    """
    if stats.last_streak_day == today:
        return False
    if stats.last_streak_day == today - timedelta(days=1):
        stats.current_streak += 1
    else:
        stats.current_streak = 1
    stats.last_streak_day = today
    stats.best_streak = max(stats.best_streak, stats.current_streak)
    return True


def get_stats(db: Session, user_id: int) -> UserStats:
    """Register creates the row, but make one if it is missing."""
    stats = db.get(UserStats, user_id)
    if stats is None:
        stats = UserStats(user_id=user_id, total_xp=0, current_streak=0, best_streak=0)
        db.add(stats)
        db.flush()
    return stats


def award(db: Session, user_id: int, xp: int, today: date, all_done: bool) -> UserStats:
    """Add XP after a 'done'. If the whole day is now cleared, count the streak day."""
    stats = get_stats(db, user_id)
    stats.total_xp += xp
    if all_done and count_streak_day(stats, today):
        db.add(StreakDay(user_id=user_id, day=today))
    db.commit()
    return stats


def week_view(db: Session, user_id: int, today: date) -> list[dict]:
    """Monday to Sunday of this week, with done = True on streak days."""
    monday = today - timedelta(days=today.weekday())
    days = [monday + timedelta(days=i) for i in range(7)]
    done_days = set(
        db.scalars(
            select(StreakDay.day).where(StreakDay.user_id == user_id, StreakDay.day.between(days[0], days[-1]))
        )
    )
    return [{"day": d, "done": d in done_days} for d in days]
