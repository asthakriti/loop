from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models import ProblemBank, User
from app.routers.settings import get_user_settings
from app.routers.today import to_suggestion
from app.schemas.stats import PatternOut
from app.services import priority

router = APIRouter(prefix="/patterns", tags=["patterns"])

# The 15 main patterns, in learning order.
MAIN_PATTERNS = [
    "Arrays", "Strings", "Hashing", "Two Pointers", "Sliding Window",
    "Binary Search", "Sorting", "Linked List", "Stack / Queue", "Recursion",
    "Trees", "Graphs", "Heap", "Basic DP", "Design",
]


def pattern_status(solved: int) -> str:
    """Covered after 3 solved problems."""
    if solved >= priority.COVERED_AT:
        return "covered"
    if solved > 0:
        return "in progress"
    return "not started"


@router.get("", response_model=list[PatternOut])
def list_patterns(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    solved = priority.solved_count_by_pattern(db, user.id)
    totals = dict(
        db.execute(
            select(ProblemBank.pattern, func.count())
            .where(ProblemBank.is_custom.is_(False))
            .group_by(ProblemBank.pattern)
        ).all()
    )
    target_company = get_user_settings(db, user.id).target_company

    result = []
    for pattern in MAIN_PATTERNS:
        top = priority.suggest(db, user.id, target_company, limit=1, pattern=pattern)
        result.append(
            PatternOut(
                pattern=pattern,
                solved=solved.get(pattern, 0),
                total=totals.get(pattern, 0),
                status=pattern_status(solved.get(pattern, 0)),
                next=to_suggestion(top[0]) if top else None,
            )
        )
    return result
