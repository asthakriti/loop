from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models import User, UserSettings
from app.schemas.settings import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


def get_user_settings(db: Session, user_id: int) -> UserSettings:
    """Load the user's settings. Register creates them, but make defaults if missing."""
    user_settings = db.get(UserSettings, user_id)
    if user_settings is None:
        user_settings = UserSettings(user_id=user_id, round_days=30, max_daily=10, new_per_day=2)
        db.add(user_settings)
        db.commit()
    return user_settings


@router.get("", response_model=SettingsOut)
def read_settings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_user_settings(db, user.id)


@router.put("", response_model=SettingsOut)
def update_settings(
    data: SettingsUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user_settings = get_user_settings(db, user.id)
    # exclude_unset: only the fields the client actually sent are changed.
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None and field != "target_company":
            continue  # numbers cannot be cleared, only changed
        setattr(user_settings, field, value)
    db.commit()
    db.refresh(user_settings)
    return user_settings
