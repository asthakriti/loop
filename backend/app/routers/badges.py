from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.badge import BadgeStatusOut
from app.services.badges import all_badges

router = APIRouter(prefix="/badges", tags=["badges"])


@router.get("", response_model=list[BadgeStatusOut])
def list_badges(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return [
        BadgeStatusOut(
            code=badge.code,
            name=badge.name,
            description=badge.description,
            unlocked=unlocked_on is not None,
            unlocked_on=unlocked_on,
        )
        for badge, unlocked_on in all_badges(db, user.id)
    ]
