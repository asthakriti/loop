from datetime import date, timedelta

import pytest
from sqlalchemy import select

from app.models import ProblemBank, Revision, User, UserProblem
from app.routers.patterns import MAIN_PATTERNS
from app.routers.stats import next_milestone
from app.services import queue
from app.services.importer import MY_SOLVED_CSV

DAY = date(2026, 3, 1)


def add_by_slugs(client, headers, slugs):
    for slug in slugs:
        assert client.post("/my/problems", headers=headers, json={"slug": slug}).status_code == 201


def graph_slugs(db, n):
    return list(
        db.scalars(select(ProblemBank.slug).where(ProblemBank.pattern == "Graphs").order_by(ProblemBank.id).limit(n))
    )


def pattern_row(client, headers, name):
    return next(p for p in client.get("/patterns", headers=headers).json() if p["pattern"] == name)


# ---------- /patterns ----------

def test_patterns_for_new_user(client, auth_headers, bank):
    items = client.get("/patterns", headers=auth_headers).json()
    assert [p["pattern"] for p in items] == MAIN_PATTERNS
    assert all(p["solved"] == 0 and p["status"] == "not started" for p in items)
    assert all(p["next"] is not None for p in items)
    totals = {p["pattern"]: p["total"] for p in items}
    assert (totals["Design"], totals["Trees"], totals["Graphs"]) == (25, 30, 26)


def test_pattern_with_3_solved_is_covered(client, auth_headers, bank, db):
    slugs = graph_slugs(db, 3)
    add_by_slugs(client, auth_headers, slugs[:1])
    assert pattern_row(client, auth_headers, "Graphs")["status"] == "in progress"

    add_by_slugs(client, auth_headers, slugs[1:2])
    assert pattern_row(client, auth_headers, "Graphs")["status"] == "in progress"

    add_by_slugs(client, auth_headers, slugs[2:])
    row = pattern_row(client, auth_headers, "Graphs")
    assert (row["solved"], row["status"]) == (3, "covered")


def test_next_suggestion_is_unsolved_and_in_the_pattern(client, auth_headers, bank, db):
    solved = graph_slugs(db, 5)
    add_by_slugs(client, auth_headers, solved)
    nxt = pattern_row(client, auth_headers, "Graphs")["next"]
    assert nxt["slug"] not in solved
    assert nxt["pattern"] == "Graphs"


def test_next_is_none_when_pattern_is_finished(client, auth_headers, bank, db):
    add_by_slugs(client, auth_headers, graph_slugs(db, 100))  # every Graphs problem
    row = pattern_row(client, auth_headers, "Graphs")
    assert (row["solved"], row["status"], row["next"]) == (26, "covered", None)


def test_patterns_need_login(client):
    assert client.get("/patterns").status_code == 401


# ---------- milestone and round ----------

@pytest.mark.parametrize("solved, target, to_go", [(0, 100, 100), (99, 100, 1), (100, 200, 100), (164, 200, 36)])
def test_next_milestone(solved, target, to_go):
    m = next_milestone(solved)
    assert (m.target, m.to_go) == (target, to_go)


def test_round_info(db, bank):
    user = User(email="round@example.com", password_hash="x")
    db.add(user)
    db.flush()
    problems = db.scalars(select(ProblemBank).order_by(ProblemBank.id).limit(4)).all()
    ups = [UserProblem(user_id=user.id, problem_id=p.id, status="in_queue", solved_on=DAY) for p in problems]
    db.add_all(ups)
    db.commit()
    assert queue.round_info(db, user.id) == queue.RoundInfo(number=1, revised=0, total=4)

    # 4 problems in the line, 5 loop revisions -> 1 full round + 1.
    for i in range(5):
        db.add(Revision(user_problem_id=ups[i % 4].id, revised_on=DAY + timedelta(days=i), section="loop", xp_earned=15))
    db.add(Revision(user_problem_id=ups[0].id, revised_on=DAY, section="warmup", xp_earned=10))  # not counted
    db.commit()
    assert queue.round_info(db, user.id) == queue.RoundInfo(number=2, revised=1, total=4)


def test_round_info_with_empty_line(db):
    user = User(email="empty@example.com", password_hash="x")
    db.add(user)
    db.flush()
    assert queue.round_info(db, user.id) == queue.RoundInfo(number=1, revised=0, total=0)


# ---------- /stats and /me/progress ----------

def test_stats_after_import(client, auth_headers, bank):
    files = {"file": ("my_solved.csv", MY_SOLVED_CSV.read_bytes(), "text/csv")}
    client.post("/my/problems/import", headers=auth_headers, files=files)
    loop_id = client.get("/today", headers=auth_headers).json()["loop"][0]["id"]
    client.post(f"/my/problems/{loop_id}/done", headers=auth_headers, json={"section": "loop"})

    stats = client.get("/stats", headers=auth_headers).json()
    assert stats["total_solved"] == 164
    assert sum(p["solved"] for p in stats["solved_per_pattern"]) == 164
    counts = [p["solved"] for p in stats["solved_per_pattern"]]
    assert counts == sorted(counts, reverse=True)  # biggest first
    assert {"pattern": "Contest / other", "solved": 11} in stats["solved_per_pattern"]
    assert stats["milestone"] == {"target": 200, "to_go": 36}
    assert stats["round"] == {"number": 1, "revised": 1, "total": 164}

    progress = client.get("/me/progress", headers=auth_headers).json()
    assert progress["round"] == {"number": 1, "revised": 1, "total": 164}


def test_stats_for_new_user(client, auth_headers):
    stats = client.get("/stats", headers=auth_headers).json()
    assert stats["total_solved"] == 0
    assert stats["solved_per_pattern"] == []
    assert stats["milestone"] == {"target": 100, "to_go": 100}


def test_stats_need_login(client):
    assert client.get("/stats").status_code == 401
