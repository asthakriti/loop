from datetime import date, timedelta

from app.core.deps import get_today
from app.main import app
from app.models import ProblemBank, User, UserProblem
from app.services import priority


def make(**overrides) -> ProblemBank:
    """A plain problem that scores 0 points. Each test turns on one rule."""
    values = dict(
        id=1,
        title="Test",
        slug="test",
        link="https://leetcode.com/problems/test/",
        pattern="Trees",
        difficulty="Medium",
        companies="",
        sources="",
        is_design=False,
        is_custom=False,
    )
    values.update(overrides)
    return ProblemBank(**values)


COVERED = {"Trees": 3, "Hashing": 3, "Graphs": 3, "Design": 3}  # these patterns are already covered


def score(problem, company=None, solved=COVERED):
    return priority.score_problem(problem, company, solved)


# ---------- each rule ----------

def test_base_problem_medium_only_gets_difficulty_points():
    result = score(make())
    assert result.score == 2  # Medium +2, nothing else
    assert result.reasons == []


def test_fresher_topic_adds_3():
    assert score(make(pattern="Hashing")).score == score(make()).score + 3
    assert "Fresher topic" in score(make(pattern="Hashing")).reasons


def test_target_company_adds_points():
    p = make(companies="Amazon, Google")
    assert score(p, company="Amazon").score == score(p).score + 3
    assert score(p, company="amazon").score == score(p).score + 3  # not case sensitive
    assert "Amazon" in score(p, company="Amazon").reasons
    assert score(p, company="Meta").score == score(p).score  # not asked by Meta


def test_two_or_more_sources_adds_2_and_shows_most_famous():
    one = make(sources="Striver SDE")
    two = make(sources="Striver SDE, Blind 75")
    assert score(two).score == score(one).score + 2
    assert "Blind 75" in score(two).reasons


def test_design_adds_points():
    assert score(make(is_design=True)).score == score(make()).score + 3
    assert "Design" in score(make(is_design=True)).reasons


def test_hard_gets_lower():
    easy = score(make(difficulty="Easy")).score
    hard = score(make(difficulty="Hard")).score
    assert easy - hard == 4  # Easy +2, Hard -2


def test_uncovered_pattern_adds_points():
    p = make(pattern="Graphs")
    assert score(p, solved={"Graphs": 2}).score == score(p, solved={"Graphs": 3}).score + 2
    assert "New pattern" in score(p, solved={}).reasons
    assert "New pattern" not in score(p, solved={"Graphs": 3}).reasons


def test_max_score_is_15_and_scales_to_10():
    best = make(
        pattern="Arrays",
        companies="Amazon",
        sources="Blind 75, NeetCode 150",
        difficulty="Easy",
        is_design=True,
    )
    result = score(best, company="Amazon", solved={})
    assert result.score == 15
    assert result.priority == 10


def test_scaled_priority_is_at_least_1():
    assert priority.scale(-2) == 1
    assert priority.scale(0) == 1
    assert priority.scale(9) == 6


# ---------- suggest (with the database) ----------

def make_user(db):
    user = User(email="prio@example.com", password_hash="x")
    db.add(user)
    db.flush()
    return user


def test_solved_problems_are_never_suggested(db, bank):
    user = make_user(db)
    top = priority.suggest(db, user.id, None, 5)
    for s in top:
        db.add(UserProblem(user_id=user.id, problem_id=s.problem.id, solved_on=date(2026, 3, 1)))
    db.commit()

    solved = {s.problem.id for s in top}
    everything = priority.suggest(db, user.id, None, 1000)
    assert len(everything) == 278 - 5
    assert not solved & {s.problem.id for s in everything}


def test_custom_problems_are_never_suggested(db, bank):
    user = make_user(db)
    db.add(ProblemBank(title="C", slug="contest-x", link="x", pattern="Contest / other",
                       difficulty="Easy", companies="", sources="", is_custom=True))
    db.commit()
    assert all(not s.problem.is_custom for s in priority.suggest(db, user.id, None, 1000))


def test_suggestions_are_sorted(db, bank):
    user = make_user(db)
    order = priority.DIFFICULTY_ORDER
    top = priority.suggest(db, user.id, "Amazon", 1000)
    keys = [(-s.score, order[s.problem.difficulty], s.problem.id) for s in top]
    assert keys == sorted(keys)


def test_target_company_changes_the_top(db, bank):
    user = make_user(db)
    top = priority.suggest(db, user.id, "Bloomberg", 5)
    assert all("Bloomberg" in s.reasons for s in top)


# ---------- API ----------

def test_suggest_api(client, auth_headers, bank):
    response = client.get("/suggest", headers=auth_headers, params={"limit": 3})
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 3
    first = items[0]
    assert {"slug", "title", "score", "priority", "reasons", "real_life"} <= first.keys()
    assert 1 <= first["priority"] <= 10


def test_suggest_uses_target_company(client, auth_headers, bank):
    client.put("/settings", headers=auth_headers, json={"target_company": "Bloomberg"})
    items = client.get("/suggest", headers=auth_headers, params={"limit": 3}).json()
    assert all("Bloomberg" in item["reasons"] for item in items)


def test_today_new_section_uses_new_per_day(client, auth_headers, bank):
    client.put("/settings", headers=auth_headers, json={"new_per_day": 3})
    new = client.get("/today", headers=auth_headers).json()["new"]
    assert len(new) == 3
    assert all(item["id"] is None and item["done_today"] is False and item["xp"] == 30 for item in new)

    client.put("/settings", headers=auth_headers, json={"new_per_day": 0})
    assert client.get("/today", headers=auth_headers).json()["new"] == []


def test_solved_it_flow(client, auth_headers, bank, today):
    """'Solved it' = add the problem, then mark it done with section 'new'."""
    first = client.get("/today", headers=auth_headers).json()["new"][0]

    up = client.post("/my/problems", headers=auth_headers, json={"slug": first["slug"]}).json()
    done = client.post(f"/my/problems/{up['id']}/done", headers=auth_headers, json={"section": "new"})
    assert done.json() == {"xp_earned": 30}

    # Today: it stays in the new list as done, and another suggestion fills the 2nd slot.
    today_page = client.get("/today", headers=auth_headers).json()
    assert today_page["new"][0]["slug"] == first["slug"]
    assert today_page["new"][0]["done_today"] is True
    assert today_page["new"][0]["id"] == up["id"]
    assert len(today_page["new"]) == 2
    assert today_page["new"][1]["done_today"] is False
    assert today_page["xp_today"] == 30

    # It is still "new", so tomorrow it shows in Warm-up.
    mine = client.get("/my/problems", headers=auth_headers).json()
    assert mine[0]["status"] == "new"
    app.dependency_overrides[get_today] = lambda: today + timedelta(days=1)
    tomorrow = client.get("/today", headers=auth_headers).json()
    assert [item["id"] for item in tomorrow["warmup"]] == [up["id"]]
    assert first["slug"] not in [item["slug"] for item in tomorrow["new"]]
