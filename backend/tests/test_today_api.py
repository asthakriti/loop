from app.services.importer import MY_SOLVED_CSV


def import_mine(client, headers):
    files = {"file": ("my_solved.csv", MY_SOLVED_CSV.read_bytes(), "text/csv")}
    client.post("/my/problems/import", headers=headers, files=files)


def get_today(client, headers):
    response = client.get("/today", headers=headers)
    assert response.status_code == 200
    return response.json()


def test_today_needs_login(client):
    assert client.get("/today").status_code == 401


def test_today_shape_after_import(client, auth_headers, bank):
    import_mine(client, auth_headers)
    today = get_today(client, auth_headers)
    assert today["daily_count"] == 6  # 164 problems, default 30 day round
    assert len(today["loop"]) == 6
    assert today["warmup"] == []
    assert len(today["new"]) == 2  # default new_per_day
    assert today["warning"] is None
    assert (today["done_count"], today["total_count"], today["xp_today"]) == (0, 8, 0)

    item = today["loop"][0]
    assert item["title"] == "Two Sum"
    assert item["xp"] == 15
    assert item["done_today"] is False
    assert item["last_revised_on"] is None


def test_clear_it_updates_today(client, auth_headers, bank):
    import_mine(client, auth_headers)
    first_id = get_today(client, auth_headers)["loop"][0]["id"]

    response = client.post(f"/my/problems/{first_id}/done", headers=auth_headers, json={"section": "loop"})
    assert response.status_code == 200
    assert response.json()["xp_earned"] == 15

    today = get_today(client, auth_headers)
    assert today["loop"][0]["id"] == first_id
    assert today["loop"][0]["done_today"] is True
    assert (today["done_count"], today["total_count"], today["xp_today"]) == (1, 8, 15)


def test_done_twice_same_day_is_409(client, auth_headers, bank):
    import_mine(client, auth_headers)
    up_id = get_today(client, auth_headers)["loop"][0]["id"]
    client.post(f"/my/problems/{up_id}/done", headers=auth_headers, json={"section": "loop"})
    response = client.post(f"/my/problems/{up_id}/done", headers=auth_headers, json={"section": "loop"})
    assert response.status_code == 409


def test_done_with_bad_section_is_422(client, auth_headers, bank):
    import_mine(client, auth_headers)
    up_id = get_today(client, auth_headers)["loop"][0]["id"]
    response = client.post(f"/my/problems/{up_id}/done", headers=auth_headers, json={"section": "later"})
    assert response.status_code == 422


def test_retire_removes_from_loop(client, auth_headers, bank):
    import_mine(client, auth_headers)
    first_id = get_today(client, auth_headers)["loop"][0]["id"]

    response = client.post(f"/my/problems/{first_id}/retire", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "retired"

    assert first_id not in [item["id"] for item in get_today(client, auth_headers)["loop"]]
    response = client.post(f"/my/problems/{first_id}/done", headers=auth_headers, json={"section": "loop"})
    assert response.status_code == 400
