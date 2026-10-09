"""Round robin tests. Every test uses fixed dates, never the real clock."""

import csv
from datetime import date, timedelta

import pytest
from sqlalchemy import select

from app.models import ProblemBank, Revision, User, UserProblem
from app.services import queue
from app.services.importer import MY_SOLVED_CSV, import_my_solved

DAY1 = date(2026, 3, 1)
DAY2 = DAY1 + timedelta(days=1)
DAY3 = DAY1 + timedelta(days=2)
DAY4 = DAY1 + timedelta(days=3)


@pytest.fixture
def user(db):
    u = User(email="queue@example.com", password_hash="x")
    db.add(u)
    db.flush()
    return u


def add_problems(db, user, n, status="in_queue", solved_on=DAY1):
    """Give the user n problems from the bank, in bank order."""
    problems = db.scalars(select(ProblemBank).order_by(ProblemBank.id).limit(n)).all()
    ups = [UserProblem(user_id=user.id, problem_id=p.id, status=status, solved_on=solved_on) for p in problems]
    db.add_all(ups)
    db.commit()
    return ups


def plan_for(db, user, today, round_days=30, max_daily=10):
    return queue.build_today(db, user.id, today, round_days, max_daily)


def loop_ids(plan):
    return [up.id for up in plan.loop]


# ---------- daily count ----------

def test_daily_count_formula():
    assert queue.daily_count(10, 5) == 2
    assert queue.daily_count(164, 30) == 6  # 5.47 rounds up
    assert queue.daily_count(0, 30) == 0


def test_10_problems_round_5_gives_2_per_day(db, bank, user):
    add_problems(db, user, 10)
    plan = plan_for(db, user, DAY1, round_days=5)
    assert plan.daily_count == 2
    assert len(plan.loop) == 2


def test_164_problems_round_30_gives_6_per_day(db, bank, user):
    with open(MY_SOLVED_CSV, encoding="utf-8-sig", newline="") as f:
        import_my_solved(db, user.id, csv.DictReader(f), DAY1)
    plan = plan_for(db, user, DAY1, round_days=30)
    assert plan.daily_count == 6
    assert len(plan.loop) == 6


def test_line_order_never_revised_first_then_oldest(db, bank, user):
    a, b, c = add_problems(db, user, 3)
    a.last_revised_on = date(2026, 2, 10)
    b.last_revised_on = date(2026, 2, 5)
    db.commit()  # c is NULL (never revised) so it goes first, then b (older), then a
    plan = plan_for(db, user, DAY1, round_days=1)
    assert loop_ids(plan) == [c.id, b.id, a.id]


# ---------- moving through the line ----------

def test_done_problem_goes_to_back_of_line(db, bank, user):
    a, b, c = add_problems(db, user, 3)  # round 3 days -> 1 per day

    assert loop_ids(plan_for(db, user, DAY1, round_days=3)) == [a.id]
    queue.mark_done(db, a, "loop", DAY1)

    assert loop_ids(plan_for(db, user, DAY2, round_days=3)) == [b.id]
    queue.mark_done(db, b, "loop", DAY2)

    assert loop_ids(plan_for(db, user, DAY3, round_days=3)) == [c.id]
    queue.mark_done(db, c, "loop", DAY3)

    # Full circle: a is back at the front.
    assert loop_ids(plan_for(db, user, DAY4, round_days=3)) == [a.id]


def test_problem_done_today_is_not_given_again_today(db, bank, user):
    ups = add_problems(db, user, 10)  # round 5 -> 2 per day
    first = plan_for(db, user, DAY1, round_days=5)
    for up in first.loop:
        queue.mark_done(db, up, "loop", DAY1)

    # Same day: the same 2 problems, both done. No 3rd problem slides in.
    again = plan_for(db, user, DAY1, round_days=5)
    assert loop_ids(again) == loop_ids(first)
    assert all(up.id in again.done_today for up in again.loop)

    # And clearing it twice is refused.
    with pytest.raises(queue.AlreadyDoneToday):
        queue.mark_done(db, ups[0], "loop", DAY1)


def test_list_is_stable_while_you_clear_it(db, bank, user):
    add_problems(db, user, 10)  # 2 per day
    first = plan_for(db, user, DAY1, round_days=5)
    queue.mark_done(db, first.loop[0], "loop", DAY1)
    after_one = plan_for(db, user, DAY1, round_days=5)
    assert loop_ids(after_one) == loop_ids(first)


def test_new_problem_shows_in_warmup_tomorrow_then_joins_line(db, bank, user):
    old = add_problems(db, user, 1)[0]
    fresh = db.scalar(select(ProblemBank).where(ProblemBank.slug == "lru-cache"))
    new_up = UserProblem(user_id=user.id, problem_id=fresh.id, status="new", solved_on=DAY1)
    db.add(new_up)
    db.commit()

    # Solved today -> not in warm-up yet.
    assert plan_for(db, user, DAY1).warmup == []

    # Tomorrow -> warm-up.
    day2 = plan_for(db, user, DAY2, round_days=1)
    assert [up.id for up in day2.warmup] == [new_up.id]
    queue.mark_done(db, new_up, "warmup", DAY2)
    assert new_up.status == "in_queue"
    assert new_up.last_revised_on == DAY2

    # Same day it stays in warm-up (done), and it does not grow today's loop count.
    day2_again = plan_for(db, user, DAY2, round_days=1)
    assert [up.id for up in day2_again.warmup] == [new_up.id]
    assert day2_again.daily_count == day2.daily_count

    # Day after: no longer in warm-up, it is in the line behind the older problem.
    day3 = plan_for(db, user, DAY3, round_days=1)
    assert day3.warmup == []
    assert loop_ids(day3) == [old.id, new_up.id]


def test_skipping_a_day_loses_nothing(db, bank, user):
    add_problems(db, user, 10)  # 2 per day
    day1 = plan_for(db, user, DAY1, round_days=5)
    # The user does nothing on DAY1 and DAY2.
    day3 = plan_for(db, user, DAY3, round_days=5)
    assert loop_ids(day3) == loop_ids(day1)  # the line simply waited


def test_warning_when_daily_count_is_more_than_max(db, bank, user):
    add_problems(db, user, 40)
    plan = plan_for(db, user, DAY1, round_days=2, max_daily=10)  # 20 per day
    assert plan.daily_count == 20
    assert len(plan.loop) == 20  # still returns the full list
    assert plan.warning == queue.TOO_MANY_WARNING


def test_no_warning_when_under_max(db, bank, user):
    add_problems(db, user, 10)
    assert plan_for(db, user, DAY1, round_days=5).warning is None


# ---------- mark done / retire ----------

def test_mark_done_updates_problem_and_adds_revision(db, bank, user):
    up = add_problems(db, user, 1)[0]
    revision = queue.mark_done(db, up, "loop", DAY1)
    assert up.last_revised_on == DAY1
    assert up.times_revised == 1
    assert revision.section == "loop"
    assert revision.xp_earned == 15
    assert db.scalar(select(Revision).where(Revision.user_problem_id == up.id)) is not None


def test_retired_problem_leaves_the_loop(db, bank, user):
    a, b = add_problems(db, user, 2)
    queue.retire(db, a)
    assert loop_ids(plan_for(db, user, DAY1, round_days=1)) == [b.id]
    with pytest.raises(queue.RetiredProblem):
        queue.mark_done(db, a, "loop", DAY1)
