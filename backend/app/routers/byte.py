from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_today
from app.database import get_db
from app.models import User
from app.schemas.byte import ByteOut
from app.services.byte import byte_for_today

router = APIRouter(prefix="/byte", tags=["daily byte"])


@router.get("/today", response_model=ByteOut)
def get_byte(
    type: Literal["code", "fact"] | None = None,
    offset: int = Query(0, ge=0, description="0 = today's byte, 1 = the next one, ..."),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    today: date = Depends(get_today),
):
    byte = byte_for_today(db, today, type, offset)
    if byte is None:
        raise HTTPException(status_code=404, detail="No daily bytes yet. Run: python -m scripts.import_bytes")
    return byte
