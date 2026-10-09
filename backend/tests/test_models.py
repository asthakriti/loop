from datetime import date

import pytest
from sqlalchemy import inspect, select
from sqlalchemy.exc import IntegrityError

from app.models import (
    Badge,
    ProblemBank,
    Revision,
    User,
    UserProblem,
    UserSettings,
    UserStats,
)

ALL_TABLES = {
    "users",
    "problem_bank",
    "user_problems",
    "revisions",
    "user_stats",
    "badges",
    "user_badges",
    "daily_bytes",
    "settings",
}


def make_user_and_problem(db):
    user = User(email="test@example.com", password_hash="hashed")
    problem = ProblemBank(
        title="Two Sum",
        slug="two-sum",
        link="https://leetcode.com/problems/two-sum/",
        topic="Arrays",
        pattern="Hashing",
        difficulty="Easy",
        companies="Amazon, Google",
        sources="Blind 75, NeetCode 150",
    )
    db.add_all([user, problem])
    db.flush()
    return user, problem


def test_migration_creates_all_tables(engine):
    tables = set(inspect(engine).get_table_names())
    assert ALL_TABLES <= tables


def test_migration_seeds_seven_badges(db):
    codes = set(db.scalars(select(Badge.code)))
    assert codes == {
        "century",
        "double_century",
        "full_circle",
        "builder",
        "explorer",
        "on_fire",
        "unstoppable",
    }


def test_insert_and_read_rows(db):
    user, problem = make_user_and_problem(db)
    user_problem = UserProblem(user_id=user.id, problem_id=problem.id, solved_on=date(2026, 1, 5))
    db.add_all(
        [
            user_problem,
            UserStats(user_id=user.id),
            UserSettings(user_id=user.id),
        ]
    )
    db.flush()
    db.add(Revision(user_problem_id=user_problem.id, revised_on=date(2026, 1, 6), section="warmup", xp_earned=10))
    db.commit()
    db.expire_all()  # force a real read from the database

    saved = db.get(UserProblem, user_problem.id)
    assert saved.status == "new"
    assert saved.times_revised == 0
    assert saved.last_revised_on is None
    assert db.get(ProblemBank, problem.id).is_design is False
    assert db.get(UserSettings, user.id).round_days == 30
    assert db.get(UserStats, user.id).total_xp == 0
    assert db.scalars(select(Revision.xp_earned)).one() == 10
    assert db.get(User, user.id).created_at is not None


def test_same_problem_twice_for_one_user_is_rejected(db):
    user, problem = make_user_and_problem(db)
    db.add(UserProblem(user_id=user.id, problem_id=problem.id, solved_on=date(2026, 1, 5)))
    db.flush()
    db.add(UserProblem(user_id=user.id, problem_id=problem.id, solved_on=date(2026, 1, 6)))
    with pytest.raises(IntegrityError):
        db.flush()


def test_bad_status_is_rejected(db):
    user, problem = make_user_and_problem(db)
    db.add(UserProblem(user_id=user.id, problem_id=problem.id, solved_on=date(2026, 1, 5), status="done"))
    with pytest.raises(IntegrityError):
        db.flush()
