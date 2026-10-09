from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_today
from app.database import get_db
from app.models import User, UserProblem
from app.routers.settings import get_user_settings
from app.schemas.today import TodayItem, TodayOut
from app.services.queue import build_today
from app.services.xp import XP_PER_SECTION

router = APIRouter(tags=["today"])


def to_item(up: UserProblem, section: str, done_today: bool) -> TodayItem:
    p = up.problem
    return TodayItem(
        id=up.id,
        title=p.title,
        link=p.link,
        pattern=p.pattern,
        difficulty=p.difficulty,
        notes=up.notes,
        real_life=p.real_life,
        last_revised_on=up.last_revised_on,
        done_today=done_today,
        xp=XP_PER_SECTION[section],
    )


@router.get("/today", response_model=TodayOut)
def get_today_page(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    today: date = Depends(get_today),
):
    user_settings = get_user_settings(db, user.id)
    plan = build_today(db, user.id, today, user_settings.round_days, user_settings.max_daily)

    warmup = [to_item(up, "warmup", up.id in plan.done_today) for up in plan.warmup]
    loop = [to_item(up, "loop", up.id in plan.done_today) for up in plan.loop]
    items = warmup + loop

    return TodayOut(
        warmup=warmup,
        loop=loop,
        new=[],
        daily_count=plan.daily_count,
        warning=plan.warning,
        done_count=sum(item.done_today for item in items),
        total_count=len(items),
        xp_today=sum(r.xp_earned for r in plan.done_today.values()),
    )
