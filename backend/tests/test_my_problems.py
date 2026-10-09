from sqlalchemy import func, select

from app.models import ProblemBank, UserProblem
from app.services.importer import MY_SOLVED_CSV


def upload(client, headers, content: bytes = None):
    if content is None:
        content = MY_SOLVED_CSV.read_bytes()
    files = {"file": ("my_solved.csv", content, "text/csv")}
    return client.post("/my/problems/import", headers=headers, files=files)


def other_user_headers(client):
    user = {"email": "other@example.com", "password": "strongpass1"}
    client.post("/auth/register", json=user)
    token = client.post("/auth/login", json=user).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def my_list(client, headers, **params):
    response = client.get("/my/problems", headers=headers, params=params)
    assert response.status_code == 200
    return response.json()


# ---------- import ----------

def test_import_gives_164_problems(client, auth_headers, bank, db, today):
    response = upload(client, auth_headers)
    assert response.status_code == 200
    assert response.json() == {"created": 164, "skipped": 0, "custom_created": 11, "missing": []}

    problems = my_list(client, auth_headers)
    assert len(problems) == 164
    # Imported problems go straight into the line, never revised yet.
    assert all(p["status"] == "in_queue" for p in problems)
    assert all(p["last_revised_on"] is None for p in problems)
    assert all(p["solved_on"] == today.isoformat() for p in problems)


def test_import_creates_custom_problems(client, auth_headers, bank, db):
    upload(client, auth_headers)
    custom = db.scalars(select(ProblemBank).where(ProblemBank.is_custom.is_(True))).all()
    assert len(custom) == 11
    assert all(p.pattern == "Contest / other" for p in custom)
    assert all(p.real_life is None for p in custom)


def test_import_twice_skips_duplicates(client, auth_headers, bank, db):
    upload(client, auth_headers)
    second = upload(client, auth_headers).json()
    assert second == {"created": 0, "skipped": 164, "custom_created": 0, "missing": []}
    assert db.scalar(select(func.count()).select_from(UserProblem)) == 164


def test_second_user_reuses_custom_problems(client, auth_headers, bank, db):
    upload(client, auth_headers)
    result = upload(client, other_user_headers(client)).json()
    assert result["created"] == 164
    assert result["custom_created"] == 0  # already in the bank from the first user
    assert db.scalar(select(func.count()).where(ProblemBank.is_custom.is_(True))) == 11


def test_custom_problems_are_hidden_from_bank(client, auth_headers, bank):
    upload(client, auth_headers)
    response = client.get("/bank", headers=auth_headers)
    assert response.json()["total"] == 278


def test_import_without_bank_reports_missing(client, auth_headers):
    result = upload(client, auth_headers).json()
    assert result["created"] == 11  # only the custom ones
    assert len(result["missing"]) == 153


def test_import_bad_csv_is_400(client, auth_headers):
    response = upload(client, auth_headers, b"name,score\nfoo,1\n")
    assert response.status_code == 400
    assert "missing columns" in response.json()["detail"]


# ---------- add ----------

def test_add_bank_problem(client, auth_headers, bank, today):
    response = client.post("/my/problems", headers=auth_headers, json={"slug": "two-sum"})
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Two Sum"
    # A newly solved problem waits in Warm-up first.
    assert body["status"] == "new"
    assert body["solved_on"] == today.isoformat()
    assert body["times_revised"] == 0


def test_add_same_problem_twice_is_409(client, auth_headers, bank):
    client.post("/my/problems", headers=auth_headers, json={"slug": "two-sum"})
    response = client.post("/my/problems", headers=auth_headers, json={"slug": "two-sum"})
    assert response.status_code == 409


def test_add_unknown_slug_is_404(client, auth_headers, bank):
    response = client.post("/my/problems", headers=auth_headers, json={"slug": "nope"})
    assert response.status_code == 404


def test_add_custom_problem(client, auth_headers, bank):
    data = {
        "title": "Weekly Contest Q3",
        "link": "https://leetcode.com/problems/weekly-contest-q3/description/",
        "difficulty": "Medium",
        "pattern": "Greedy",
    }
    response = client.post("/my/problems", headers=auth_headers, json=data)
    assert response.status_code == 201
    body = response.json()
    assert body["slug"] == "weekly-contest-q3"
    assert body["is_custom"] is True
    assert body["pattern"] == "Greedy"


def test_add_with_missing_fields_is_422(client, auth_headers):
    response = client.post("/my/problems", headers=auth_headers, json={"title": "Only a title"})
    assert response.status_code == 422


# ---------- list ----------

def test_list_filters(client, auth_headers, bank):
    upload(client, auth_headers)
    client.post("/my/problems", headers=auth_headers, json={"slug": "lru-cache"})

    hashing = my_list(client, auth_headers, pattern="Hashing")
    assert hashing and all(p["pattern"] == "Hashing" for p in hashing)

    easy = my_list(client, auth_headers, difficulty="Easy")
    assert easy and all(p["difficulty"] == "Easy" for p in easy)

    new = my_list(client, auth_headers, status="new")
    assert [p["slug"] for p in new] == ["lru-cache"]

    search = my_list(client, auth_headers, q="two sum")
    assert "two-sum" in [p["slug"] for p in search]
    assert all("two sum" in p["title"].lower() for p in search)


def test_list_shows_only_my_problems(client, auth_headers, bank):
    upload(client, auth_headers)
    assert my_list(client, other_user_headers(client)) == []


def test_list_needs_login(client):
    assert client.get("/my/problems").status_code == 401


# ---------- edit notes / delete ----------

def test_edit_notes(client, auth_headers, bank):
    up_id = client.post("/my/problems", headers=auth_headers, json={"slug": "two-sum"}).json()["id"]
    response = client.put(f"/my/problems/{up_id}", headers=auth_headers, json={"notes": "hash map of value -> index"})
    assert response.status_code == 200
    assert response.json()["notes"] == "hash map of value -> index"


def test_delete(client, auth_headers, bank):
    up_id = client.post("/my/problems", headers=auth_headers, json={"slug": "two-sum"}).json()["id"]
    assert client.delete(f"/my/problems/{up_id}", headers=auth_headers).status_code == 204
    assert my_list(client, auth_headers) == []
    # The bank problem itself is still there.
    assert client.get("/bank/two-sum", headers=auth_headers).status_code == 200


def test_cannot_touch_other_users_problem(client, auth_headers, bank):
    up_id = client.post("/my/problems", headers=auth_headers, json={"slug": "two-sum"}).json()["id"]
    other = other_user_headers(client)
    assert client.put(f"/my/problems/{up_id}", headers=other, json={"notes": "x"}).status_code == 404
    assert client.delete(f"/my/problems/{up_id}", headers=other).status_code == 404
