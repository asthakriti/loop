"""XP, levels and streak tests. Fixed dates only."""

from datetime import date, timedelta

import pytest
from sqlalchemy import select

from app.core.deps import get_today
from app.main import app
from app.models import ProblemBank, User, UserProblem, UserStats
from app.services import xp

MON = date(2026, 3, 9)
TUE = MON + timedelta(days=1)  # TEST_TODAY in conftest
WED = MON + timedelta(days=2)
THU = MON + timedelta(days=3)
FRI = MON + timedelta(days=4)


# ---------- levels ----------

@pytest.mark.parametrize(
    "total_xp, level, name",
    [
        (0, 1, "Beginner"),
        (99, 1, "Beginner"),
        (100, 2, "Starter"),
        (1199, 6, "Pattern Seeker"),
        (1200, 7, "Pattern Hunter"),
        (1499, 7, "Pattern Hunter"),
        (1500, 8, "Algorithm Ace"),
        (2400, 10, "Interview Ready"),
        (9999, 10, "Interview Ready"),
    ],
)
def test_level_for(total_xp, level, name):
    info = xp.level_for(total_xp)
    assert (info.level, info.name) == (level, name)


def test_level_has_start_and_next_xp():
    info = xp.level_for(1300)
    assert (info.level_xp, info.next_level_xp) == (1200, 1500)
    assert xp.level_for(5000).next_level_xp is None  # max level


# ---------- streak rules (no database) ----------

def new_stats():
    return UserStats(user_id=1, total_xp=0, current_streak=0, best_streak=0, last_streak_day=None)


def test_first_streak_day_is_1():
    stats = new_stats()
    assert xp.count_streak_day(stats, MON) is True
    assert (stats.current_streak, stats.best_streak) == (1, 1)


def test_streak_grows_on_back_to_back_days():
    stats = new_stats()
    for day in (MON, TUE, WED):
        xp.count_streak_day(stats, day)
    assert stats.current_streak == 3


def test_streak_counted_once_per_day():
    stats = new_stats()
    xp.count_streak_day(stats, MON)
    assert xp.count_streak_day(stats, MON) is False
    assert stats.current_streak == 1


def test_missed_day_resets_but_best_is_kept():
    stats = new_stats()
    xp.count_streak_day(stats, MON)
    xp.count_streak_day(stats, TUE)  # streak 2
    # Missed WED.
    assert xp.current_streak(stats, THU) == 0  # shown as 0
    assert stats.best_streak == 2
    xp.count_streak_day(stats, THU)
    assert (stats.current_streak, stats.best_streak) == (1, 2)


def test_streak_still_shows_on_the_next_morning():
    stats = new_stats()
    xp.count_streak_day(stats, MON)
    assert xp.current_streak(stats, TUE) == 1  # not done yet today, but not broken


# ---------- through the API ----------

def set_day(day):
    app.dependency_overrides[get_today] = lambda: day


def give_problems(db, n):
    """Put n problems in the test user's line (never revised)."""
    user = db.scalar(select(User).where(User.email == "tester@example.com"))
    problems = db.scalars(select(ProblemBank).order_by(ProblemBank.id).limit(n)).all()
    db.add_all(UserProblem(user_id=user.id, problem_id=p.id, status="in_queue", solved_on=MON) for p in problems)
    db.commit()


def clear_today(client, headers):
    """Clear every loop item of today. Returns the last 'done' response."""
    last = None
    for item in client.get("/today", headers=headers).json()["loop"]:
        if not item["done_today"]:
            last = client.post(f"/my/problems/{item['id']}/done", headers=headers, json={"section": "loop"}).json()
    return last


@pytest.fixture
def setup(client, auth_headers, db, bank):
    # No new quests, so the day is only the loop. 8 problems / 7 days = 2 per day.
    client.put("/settings", headers=auth_headers, json={"new_per_day": 0, "round_days": 7})
    give_problems(db, 8)
    return auth_headers


def test_xp_per_section(client, setup, db):
    headers = setup
    set_day(MON)
    loop_id = client.get("/today", headers=headers).json()["loop"][0]["id"]
    assert client.post(f"/my/problems/{loop_id}/done", headers=headers, json={"section": "loop"}).json()["xp_earned"] == 15

    new_id = client.post("/my/problems", headers=headers, json={"slug": "lru-cache"}).json()["id"]
    body = client.post(f"/my/problems/{new_id}/done", headers=headers, json={"section": "new"}).json()
    assert body["xp_earned"] == 30
    assert body["total_xp"] == 45

    set_day(TUE)  # lru-cache is in warm-up today
    body = client.post(f"/my/problems/{new_id}/done", headers=headers, json={"section": "warmup"}).json()
    assert body["xp_earned"] == 10
    assert body["total_xp"] == 55


def test_level_changes_in_done_response(client, setup, db):
    headers = setup
    stats = db.scalar(select(UserStats))
    stats.total_xp = 1190
    db.commit()
    set_day(MON)
    body = clear_today(client, headers)  # two loop problems: +15 +15
    assert body["total_xp"] == 1220
    assert (body["level"], body["level_name"]) == (7, "Pattern Hunter")


def test_streak_only_when_everything_is_done(client, setup):
    headers = setup
    set_day(MON)
    loop = client.get("/today", headers=headers).json()["loop"]
    assert len(loop) == 2

    first = client.post(f"/my/problems/{loop[0]['id']}/done", headers=headers, json={"section": "loop"}).json()
    assert first["all_done"] is False
    assert first["streak"] == 0

    second = client.post(f"/my/problems/{loop[1]['id']}/done", headers=headers, json={"section": "loop"}).json()
    assert second["all_done"] is True
    assert second["streak"] == 1


def test_streak_over_days_and_reset_after_missed_day(client, setup):
    headers = setup
    set_day(MON)
    assert clear_today(client, headers)["streak"] == 1
    set_day(TUE)
    assert clear_today(client, headers)["streak"] == 2

    # Missed WED. On THU it shows 0, best stays 2.
    set_day(THU)
    progress = client.get("/me/progress", headers=headers).json()
    assert (progress["current_streak"], progress["best_streak"]) == (0, 2)

    assert clear_today(client, headers)["streak"] == 1
    progress = client.get("/me/progress", headers=headers).json()
    assert (progress["current_streak"], progress["best_streak"]) == (1, 2)


def test_progress_week_view(client, setup):
    headers = setup
    set_day(MON)
    clear_today(client, headers)
    set_day(WED)
    clear_today(client, headers)

    progress = client.get("/me/progress", headers=headers).json()
    week = progress["week"]
    assert [d["day"] for d in week][0] == MON.isoformat()
    assert len(week) == 7
    assert [d["done"] for d in week] == [True, False, True, False, False, False, False]


def test_progress_for_a_new_user(client, auth_headers):
    progress = client.get("/me/progress", headers=auth_headers).json()
    assert progress["total_xp"] == 0
    assert (progress["level"], progress["level_name"]) == (1, "Beginner")
    assert (progress["level_xp"], progress["next_level_xp"]) == (0, 100)
    assert (progress["current_streak"], progress["best_streak"]) == (0, 0)


def test_progress_needs_login(client):
    assert client.get("/me/progress").status_code == 401
