from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_today
from app.database import get_db
from app.models import User, UserProblem
from app.routers.settings import get_user_settings
from app.schemas.today import NewQuestItem, SuggestionOut, TodayItem, TodayOut
from app.services import priority
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


def to_suggestion(s: priority.Suggestion) -> SuggestionOut:
    p = s.problem
    return SuggestionOut(
        slug=p.slug,
        title=p.title,
        link=p.link,
        pattern=p.pattern,
        difficulty=p.difficulty,
        real_life=p.real_life,
        score=s.score,
        priority=s.priority,
        reasons=s.reasons,
    )


def to_new_quest(s: priority.Suggestion, user_problem_id: int | None) -> NewQuestItem:
    return NewQuestItem(
        **to_suggestion(s).model_dump(),
        id=user_problem_id,
        done_today=user_problem_id is not None,
        xp=XP_PER_SECTION["new"],
    )


@router.get("/suggest", response_model=list[SuggestionOut])
def get_suggestions(
    limit: int = Query(2, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user_settings = get_user_settings(db, user.id)
    return [to_suggestion(s) for s in priority.suggest(db, user.id, user_settings.target_company, limit)]


@router.get("/today", response_model=TodayOut)
def get_today_page(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    today: date = Depends(get_today),
):
    return build_today_page(db, user, today)


def build_today_page(db: Session, user: User, today: date) -> TodayOut:
    """Warm-up + Loop + New quests for one day. Also used by 'done' to check if the day is cleared."""
    user_settings = get_user_settings(db, user.id)
    plan = build_today(db, user.id, today, user_settings.round_days, user_settings.max_daily)

    warmup = [to_item(up, "warmup", up.id in plan.done_today) for up in plan.warmup]
    loop = [to_item(up, "loop", up.id in plan.done_today) for up in plan.loop]

    # New quests: the ones solved today stay in the list (done),
    # then the top suggestions fill the rest up to new_per_day.
    by_pattern = priority.solved_count_by_pattern(db, user.id)
    solved_today = [
        db.get(UserProblem, up_id) for up_id, r in plan.done_today.items() if r.section == "new"
    ]
    new = [
        to_new_quest(priority.score_problem(up.problem, user_settings.target_company, by_pattern), up.id)
        for up in solved_today
    ]
    remaining = max(user_settings.new_per_day - len(new), 0)
    if remaining:
        top = priority.suggest(db, user.id, user_settings.target_company, remaining)
        new += [to_new_quest(s, None) for s in top]

    done_flags = [i.done_today for i in warmup] + [i.done_today for i in loop] + [i.done_today for i in new]
    return TodayOut(
        warmup=warmup,
        loop=loop,
        new=new,
        daily_count=plan.daily_count,
        warning=plan.warning,
        done_count=sum(done_flags),
        total_count=len(done_flags),
        xp_today=sum(r.xp_earned for r in plan.done_today.values()),
    )
