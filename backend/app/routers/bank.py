from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models import ProblemBank, User, UserProblem
from app.schemas.bank import ProblemOut, ProblemPage

router = APIRouter(prefix="/bank", tags=["problem bank"])


def solved_ids_query(user_id: int):
    """Ids of bank problems this user has solved (any row in user_problems)."""
    return select(UserProblem.problem_id).where(UserProblem.user_id == user_id)


def to_out(problem: ProblemBank, solved: bool) -> ProblemOut:
    out = ProblemOut.model_validate(problem)
    out.solved = solved
    return out


@router.get("", response_model=ProblemPage)
def list_bank(
    pattern: str | None = None,
    difficulty: str | None = None,
    company: str | None = None,
    is_design: bool | None = None,
    solved: bool | None = None,
    q: str | None = Query(None, description="Search in the title"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(ProblemBank)

    # Add one WHERE condition for each filter the caller sent.
    if pattern:
        query = query.where(ProblemBank.pattern == pattern)
    if difficulty:
        query = query.where(ProblemBank.difficulty == difficulty)
    if company:
        # companies is stored as text like "Amazon, Google", so search inside it.
        query = query.where(ProblemBank.companies.ilike(f"%{company}%"))
    if is_design is not None:
        query = query.where(ProblemBank.is_design == is_design)
    if q:
        query = query.where(ProblemBank.title.ilike(f"%{q}%"))

    solved_ids = solved_ids_query(user.id)
    if solved is True:
        query = query.where(ProblemBank.id.in_(solved_ids))
    elif solved is False:
        query = query.where(ProblemBank.id.not_in(solved_ids))

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    problems = db.scalars(
        query.order_by(ProblemBank.id).offset((page - 1) * page_size).limit(page_size)
    ).all()

    my_solved = set(db.scalars(solved_ids))
    return ProblemPage(
        items=[to_out(p, p.id in my_solved) for p in problems],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{slug}", response_model=ProblemOut)
def get_problem(
    slug: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    problem = db.scalar(select(ProblemBank).where(ProblemBank.slug == slug))
    if problem is None:
        raise HTTPException(status_code=404, detail="Problem not found")
    solved = db.scalar(
        select(UserProblem.id).where(UserProblem.user_id == user.id, UserProblem.problem_id == problem.id)
    )
    return to_out(problem, solved is not None)
