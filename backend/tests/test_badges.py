from datetime import date

import pytest
from sqlalchemy import select

from app.models import ProblemBank, User, UserBadge, UserProblem
from app.services import badges
from app.services.xp import get_stats

DAY = date(2026, 3, 10)


@pytest.fixture
def user(db):
    u = User(email="badge@example.com", password_hash="x")
    db.add(u)
    db.flush()
    return u


def give(db, user, problems, status="in_queue", times_revised=0):
    db.add_all(
        UserProblem(user_id=user.id, problem_id=p.id, status=status, solved_on=DAY, times_revised=times_revised)
        for p in problems
    )
    db.commit()


def plain_problems(db, n):
    """n problems that are not design and not Graphs, so only count badges can unlock."""
    return db.scalars(
        select(ProblemBank)
        .where(ProblemBank.is_design.is_(False), ProblemBank.pattern != "Graphs")
        .order_by(ProblemBank.id)
        .limit(n)
    ).all()


def codes(badge_list):
    return [b.code for b in badge_list]


def test_no_badges_for_a_new_user(db, bank, user):
    assert badges.check_badges(db, user.id, DAY) == []


def test_century_at_100_not_99(db, bank, user):
    problems = plain_problems(db, 100)
    give(db, user, problems[:99], status="new")
    assert "century" not in codes(badges.check_badges(db, user.id, DAY))

    give(db, user, problems[99:], status="new")
    assert "century" in codes(badges.check_badges(db, user.id, DAY))


def test_double_century_at_200(db, bank, user):
    give(db, user, plain_problems(db, 200), status="new")
    assert {"century", "double_century"} <= set(codes(badges.check_badges(db, user.id, DAY)))


def test_each_badge_unlocks_only_once(db, bank, user):
    give(db, user, plain_problems(db, 100), status="new")
    assert codes(badges.check_badges(db, user.id, DAY)) == ["century"]
    assert badges.check_badges(db, user.id, DAY) == []  # second check: nothing new
    assert len(db.scalars(select(UserBadge).where(UserBadge.user_id == user.id)).all()) == 1


def test_full_circle_when_every_line_problem_was_revised(db, bank, user):
    a, b = plain_problems(db, 2)
    give(db, user, [a], times_revised=1)
    give(db, user, [b], times_revised=0)
    assert "full_circle" not in codes(badges.check_badges(db, user.id, DAY))

    db.scalar(select(UserProblem).where(UserProblem.problem_id == b.id)).times_revised = 1
    db.commit()
    assert "full_circle" in codes(badges.check_badges(db, user.id, DAY))


def test_builder_for_first_design_problem(db, bank, user):
    design = db.scalar(select(ProblemBank).where(ProblemBank.is_design.is_(True)))
    give(db, user, [design], status="new")
    assert "builder" in codes(badges.check_badges(db, user.id, DAY))


def test_explorer_for_first_graphs_problem(db, bank, user):
    graph = db.scalar(select(ProblemBank).where(ProblemBank.pattern == "Graphs", ProblemBank.is_design.is_(False)))
    give(db, user, [graph], status="new")
    assert codes(badges.check_badges(db, user.id, DAY)) == ["explorer"]


@pytest.mark.parametrize("best, expected", [(6, set()), (7, {"on_fire"}), (29, {"on_fire"}), (30, {"on_fire", "unstoppable"})])
def test_streak_badges(db, bank, user, best, expected):
    get_stats(db, user.id).best_streak = best
    db.commit()
    assert set(codes(badges.check_badges(db, user.id, DAY))) == expected


# ---------- API ----------

def test_badges_list_shows_locked_and_unlocked(client, auth_headers, bank):
    items = client.get("/badges", headers=auth_headers).json()
    assert len(items) == 7
    assert all(item["unlocked"] is False and item["unlocked_on"] is None for item in items)

    up = client.post("/my/problems", headers=auth_headers, json={"slug": "lru-cache"}).json()  # a design problem
    done = client.post(f"/my/problems/{up['id']}/done", headers=auth_headers, json={"section": "new"}).json()
    assert [b["code"] for b in done["new_badges"]] == ["builder"]
    assert done["new_badges"][0]["name"] == "Builder"

    builder = next(item for item in client.get("/badges", headers=auth_headers).json() if item["code"] == "builder")
    assert builder["unlocked"] is True
    assert builder["unlocked_on"] == "2026-03-10"


def test_done_returns_no_badges_the_second_time(client, auth_headers, bank):
    first = client.post("/my/problems", headers=auth_headers, json={"slug": "lru-cache"}).json()
    client.post(f"/my/problems/{first['id']}/done", headers=auth_headers, json={"section": "new"})

    second = client.post("/my/problems", headers=auth_headers, json={"slug": "min-stack"}).json()
    done = client.post(f"/my/problems/{second['id']}/done", headers=auth_headers, json={"section": "new"}).json()
    assert done["new_badges"] == []


def test_badges_need_login(client):
    assert client.get("/badges").status_code == 401
