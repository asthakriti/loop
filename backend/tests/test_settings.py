import pytest

from app.services.importer import MY_SOLVED_CSV


def put(client, headers, **data):
    return client.put("/settings", headers=headers, json=data)


def import_mine(client, headers):
    files = {"file": ("my_solved.csv", MY_SOLVED_CSV.read_bytes(), "text/csv")}
    client.post("/my/problems/import", headers=headers, files=files)


def test_settings_need_login(client):
    assert client.get("/settings").status_code == 401
    assert client.put("/settings", json={"round_days": 10}).status_code == 401


def test_default_settings(client, auth_headers):
    response = client.get("/settings", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == {"round_days": 30, "max_daily": 10, "new_per_day": 2, "target_company": None}


def test_update_settings(client, auth_headers):
    response = put(client, auth_headers, round_days=14, max_daily=12, new_per_day=3, target_company="Amazon")
    assert response.status_code == 200
    assert response.json() == {"round_days": 14, "max_daily": 12, "new_per_day": 3, "target_company": "Amazon"}
    assert client.get("/settings", headers=auth_headers).json()["round_days"] == 14


def test_partial_update_keeps_other_fields(client, auth_headers):
    put(client, auth_headers, target_company="Google")
    response = put(client, auth_headers, round_days=45)
    assert response.json() == {"round_days": 45, "max_daily": 10, "new_per_day": 2, "target_company": "Google"}


def test_blank_company_clears_it(client, auth_headers):
    put(client, auth_headers, target_company="Amazon")
    assert put(client, auth_headers, target_company="  ").json()["target_company"] is None


@pytest.mark.parametrize(
    "field, bad_value",
    [
        ("round_days", 6),
        ("round_days", 91),
        ("max_daily", 0),
        ("max_daily", 31),
        ("new_per_day", -1),
        ("new_per_day", 6),
    ],
)
def test_values_out_of_range_are_rejected(client, auth_headers, field, bad_value):
    assert put(client, auth_headers, **{field: bad_value}).status_code == 422


@pytest.mark.parametrize("field, edge", [("round_days", 7), ("round_days", 90), ("max_daily", 1), ("max_daily", 30), ("new_per_day", 0), ("new_per_day", 5)])
def test_edge_values_are_allowed(client, auth_headers, field, edge):
    assert put(client, auth_headers, **{field: edge}).status_code == 200


def test_changing_round_days_changes_daily_count(client, auth_headers, bank):
    import_mine(client, auth_headers)  # 164 problems
    assert client.get("/today", headers=auth_headers).json()["daily_count"] == 6  # ceil(164 / 30)

    put(client, auth_headers, round_days=60)
    today = client.get("/today", headers=auth_headers).json()
    assert today["daily_count"] == 3  # ceil(164 / 60)
    assert len(today["loop"]) == 3


def test_max_daily_controls_the_warning(client, auth_headers, bank):
    import_mine(client, auth_headers)
    put(client, auth_headers, round_days=7)  # ceil(164 / 7) = 24 per day
    assert client.get("/today", headers=auth_headers).json()["warning"] is not None

    put(client, auth_headers, max_daily=30)
    assert client.get("/today", headers=auth_headers).json()["warning"] is None
