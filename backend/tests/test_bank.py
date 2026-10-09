from datetime import date

from sqlalchemy import func, select

from app.models import ProblemBank, User, UserProblem
from app.services.importer import import_bank


def count_problems(db):
    return db.scalar(select(func.count()).select_from(ProblemBank))


def get_bank(client, headers, **params):
    response = client.get("/bank", headers=headers, params=params)
    assert response.status_code == 200
    return response.json()


# ---------- import ----------

def test_import_loads_278_problems(db, bank):
    assert bank == {"created": 278, "updated": 0}
    assert count_problems(db) == 278


def test_import_twice_does_not_duplicate(db, bank):
    second = import_bank(db)
    assert second == {"created": 0, "updated": 278}
    assert count_problems(db) == 278


def test_import_reads_fields_correctly(db, bank):
    two_sum = db.scalar(select(ProblemBank).where(ProblemBank.slug == "two-sum"))
    assert two_sum.title == "Two Sum"
    assert two_sum.pattern == "Hashing"
    assert two_sum.difficulty == "Easy"
    assert two_sum.is_design is False
    assert two_sum.is_custom is False
    assert "Amazon" in two_sum.companies
    assert two_sum.real_life


# ---------- GET /bank ----------

def test_bank_needs_login(client, bank):
    assert client.get("/bank").status_code == 401


def test_bank_pagination(client, auth_headers, bank):
    page1 = get_bank(client, auth_headers, page=1, page_size=50)
    page6 = get_bank(client, auth_headers, page=6, page_size=50)
    assert page1["total"] == 278
    assert len(page1["items"]) == 50
    assert page1["items"][0]["slug"] == "two-sum"
    assert len(page6["items"]) == 28  # 278 - 5 * 50


def test_bank_returns_lists_for_companies_and_sources(client, auth_headers, bank):
    first = get_bank(client, auth_headers, q="Two Sum")["items"][0]
    assert "Amazon" in first["companies"]
    assert "Blind 75" in first["sources"]


def test_filter_by_pattern(client, auth_headers, bank):
    result = get_bank(client, auth_headers, pattern="Design", page_size=100)
    assert result["total"] == 25
    assert all(p["pattern"] == "Design" for p in result["items"])


def test_filter_by_difficulty(client, auth_headers, bank):
    result = get_bank(client, auth_headers, difficulty="Hard", page_size=100)
    assert result["total"] == 22
    assert all(p["difficulty"] == "Hard" for p in result["items"])


def test_filter_by_company(client, auth_headers, bank):
    result = get_bank(client, auth_headers, company="Google", page_size=100)
    assert result["total"] == 95
    assert all("Google" in p["companies"] for p in result["items"])


def test_filter_by_is_design(client, auth_headers, bank):
    result = get_bank(client, auth_headers, is_design=True, page_size=100)
    assert result["total"] == 26
    assert all(p["is_design"] for p in result["items"])


def test_search_by_title(client, auth_headers, bank):
    result = get_bank(client, auth_headers, q="two sum", page_size=100)
    assert result["total"] >= 1
    assert all("two sum" in p["title"].lower() for p in result["items"])


def test_filters_combine(client, auth_headers, bank):
    result = get_bank(client, auth_headers, pattern="Design", difficulty="Hard", page_size=100)
    assert all(p["pattern"] == "Design" and p["difficulty"] == "Hard" for p in result["items"])


def test_filter_by_solved(client, auth_headers, db, bank):
    user = db.scalar(select(User).where(User.email == "tester@example.com"))
    two_sum = db.scalar(select(ProblemBank).where(ProblemBank.slug == "two-sum"))
    db.add(UserProblem(user_id=user.id, problem_id=two_sum.id, solved_on=date(2026, 1, 5)))
    db.commit()

    solved = get_bank(client, auth_headers, solved=True)
    assert solved["total"] == 1
    assert solved["items"][0]["slug"] == "two-sum"
    assert solved["items"][0]["solved"] is True

    unsolved = get_bank(client, auth_headers, solved=False)
    assert unsolved["total"] == 277
    assert all(p["solved"] is False for p in unsolved["items"])


# ---------- GET /bank/{slug} ----------

def test_get_one_problem(client, auth_headers, bank):
    response = client.get("/bank/two-sum", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["title"] == "Two Sum"
    assert response.json()["solved"] is False


def test_get_unknown_problem_is_404(client, auth_headers, bank):
    response = client.get("/bank/not-a-problem", headers=auth_headers)
    assert response.status_code == 404
