import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_today
from app.database import get_db
from app.models import ProblemBank, User, UserProblem
from app.schemas.my_problem import ImportResult, MyProblemCreate, MyProblemOut, MyProblemUpdate
from app.services.importer import get_or_create_custom_problem, import_my_solved, slug_from

router = APIRouter(prefix="/my/problems", tags=["my problems"])


def to_out(up: UserProblem) -> MyProblemOut:
    """Join the user's row with its bank problem into one flat response."""
    p = up.problem
    return MyProblemOut(
        id=up.id,
        problem_id=p.id,
        slug=p.slug,
        title=p.title,
        link=p.link,
        pattern=p.pattern,
        difficulty=p.difficulty,
        is_custom=p.is_custom,
        real_life=p.real_life,
        status=up.status,
        solved_on=up.solved_on,
        last_revised_on=up.last_revised_on,
        times_revised=up.times_revised,
        notes=up.notes,
    )


def get_own_problem(db: Session, user: User, user_problem_id: int) -> UserProblem:
    """Load one of the user's problems. Another user's problem looks like 'not found'."""
    up = db.get(UserProblem, user_problem_id)
    if up is None or up.user_id != user.id:
        raise HTTPException(status_code=404, detail="Problem not found in your list")
    return up


@router.post("", response_model=MyProblemOut, status_code=status.HTTP_201_CREATED)
def add_problem(
    data: MyProblemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    today: date = Depends(get_today),
):
    if data.slug:
        problem = db.scalar(select(ProblemBank).where(ProblemBank.slug == data.slug))
        if problem is None:
            raise HTTPException(status_code=404, detail="No problem with this slug in the bank")
    else:
        slug = slug_from(data.link, data.title)
        problem = get_or_create_custom_problem(
            db, slug, data.title, data.link, data.difficulty, data.pattern
        )

    exists = db.scalar(
        select(UserProblem).where(UserProblem.user_id == user.id, UserProblem.problem_id == problem.id)
    )
    if exists:
        raise HTTPException(status_code=409, detail="This problem is already in your list")

    # A newly solved problem starts as "new": it shows in Warm-up tomorrow, then joins the line.
    up = UserProblem(user_id=user.id, problem_id=problem.id, status="new", solved_on=today)
    db.add(up)
    db.commit()
    db.refresh(up)
    return to_out(up)


@router.post("/import", response_model=ImportResult)
async def import_problems(
    file: UploadFile = File(..., description="A CSV in my_solved.csv format"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    today: date = Depends(get_today),
):
    try:
        text = (await file.read()).decode("utf-8-sig")
        return import_my_solved(db, user.id, csv.DictReader(io.StringIO(text)), today)
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be a UTF-8 CSV")
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.get("", response_model=list[MyProblemOut])
def list_problems(
    pattern: str | None = None,
    status: str | None = None,
    difficulty: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(UserProblem).join(UserProblem.problem).where(UserProblem.user_id == user.id)
    if pattern:
        query = query.where(ProblemBank.pattern == pattern)
    if status:
        query = query.where(UserProblem.status == status)
    if difficulty:
        query = query.where(ProblemBank.difficulty == difficulty)
    if q:
        query = query.where(ProblemBank.title.ilike(f"%{q}%"))

    return [to_out(up) for up in db.scalars(query.order_by(UserProblem.id))]


@router.put("/{user_problem_id}", response_model=MyProblemOut)
def update_notes(
    user_problem_id: int,
    data: MyProblemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    up = get_own_problem(db, user, user_problem_id)
    up.notes = data.notes
    db.commit()
    db.refresh(up)
    return to_out(up)


@router.delete("/{user_problem_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_problem(
    user_problem_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    up = get_own_problem(db, user, user_problem_id)
    db.delete(up)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
