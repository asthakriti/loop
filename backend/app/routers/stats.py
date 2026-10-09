from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.stats import MilestoneOut, PatternCount, RoundOut, StatsOut
from app.services import priority, queue

router = APIRouter(prefix="/stats", tags=["stats"])

MILESTONE_STEP = 100


def next_milestone(total_solved: int) -> MilestoneOut:
    """The next multiple of 100 above what you have. 164 -> 200, 36 to go."""
    target = (total_solved // MILESTONE_STEP + 1) * MILESTONE_STEP
    return MilestoneOut(target=target, to_go=target - total_solved)


@router.get("", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    by_pattern = priority.solved_count_by_pattern(db, user.id)
    total = sum(by_pattern.values())
    rnd = queue.round_info(db, user.id)
    return StatsOut(
        total_solved=total,
        solved_per_pattern=[
            PatternCount(pattern=p, solved=n)
            for p, n in sorted(by_pattern.items(), key=lambda item: (-item[1], item[0]))
        ],
        round=RoundOut(number=rnd.number, revised=rnd.revised, total=rnd.total),
        milestone=next_milestone(total),
    )
