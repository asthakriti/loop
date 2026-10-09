from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_today
from app.database import get_db
from app.models import User
from app.schemas.progress import ProgressOut, WeekDay
from app.services import xp

router = APIRouter(prefix="/me", tags=["progress"])


@router.get("/progress", response_model=ProgressOut)
def get_progress(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    today: date = Depends(get_today),
):
    stats = xp.get_stats(db, user.id)
    level = xp.level_for(stats.total_xp)
    return ProgressOut(
        total_xp=stats.total_xp,
        level=level.level,
        level_name=level.name,
        level_xp=level.level_xp,
        next_level_xp=level.next_level_xp,
        current_streak=xp.current_streak(stats, today),
        best_streak=stats.best_streak,
        week=[WeekDay(**d) for d in xp.week_view(db, user.id, today)],
    )
