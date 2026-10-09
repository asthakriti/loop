# Import every model here so Base.metadata knows all tables (Alembic needs this).
from app.models.badge import Badge, UserBadge
from app.models.daily_byte import DailyByte
from app.models.problem_bank import ProblemBank
from app.models.revision import Revision
from app.models.user import User
from app.models.user_problem import UserProblem
from app.models.user_settings import UserSettings
from app.models.user_stats import UserStats

__all__ = [
    "Badge",
    "DailyByte",
    "ProblemBank",
    "Revision",
    "User",
    "UserBadge",
    "UserProblem",
    "UserSettings",
    "UserStats",
]
