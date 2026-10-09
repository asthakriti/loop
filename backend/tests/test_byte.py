import csv
from datetime import date, timedelta

import pytest
from sqlalchemy import func, select

from app.core.deps import get_today
from app.main import app
from app.models import DailyByte
from app.services.byte import START_DATE, byte_for_today, byte_index
from app.services.importer import BYTES_CSV, import_bytes

DAY = date(2026, 3, 10)


@pytest.fixture
def bytes_loaded(db):
    return import_bytes(db)


# ---------- the CSV itself ----------

def test_csv_has_15_code_and_15_facts():
    rows = list(csv.DictReader(open(BYTES_CSV, encoding="utf-8")))
    assert len(rows) == 30
    assert sum(r["type"] == "code" for r in rows) == 15
    assert sum(r["type"] == "fact" for r in rows) == 15
    assert all(r["why_it_matters"].strip() for r in rows)


def test_code_snippets_are_short():
    rows = csv.DictReader(open(BYTES_CSV, encoding="utf-8"))
    assert all(len(r["content"].splitlines()) < 12 for r in rows if r["type"] == "code")


# ---------- import ----------

def test_import_30_bytes(db, bytes_loaded):
    assert bytes_loaded == {"created": 30, "updated": 0}


def test_import_twice_does_not_duplicate(db, bytes_loaded):
    assert import_bytes(db) == {"created": 0, "updated": 30}
    assert db.scalar(select(func.count()).select_from(DailyByte)) == 30


# ---------- picking the byte ----------

def test_byte_index_is_round_robin():
    assert byte_index(START_DATE, 30) == 0
    assert byte_index(START_DATE + timedelta(days=1), 30) == 1
    assert byte_index(START_DATE + timedelta(days=30), 30) == 0  # starts again


def test_same_byte_all_day(db, bytes_loaded):
    assert byte_for_today(db, DAY).id == byte_for_today(db, DAY).id


def test_different_byte_tomorrow(db, bytes_loaded):
    assert byte_for_today(db, DAY).id != byte_for_today(db, DAY + timedelta(days=1)).id


def test_type_filter(db, bytes_loaded):
    assert byte_for_today(db, DAY, "code").type == "code"
    assert byte_for_today(db, DAY, "fact").type == "fact"


def test_each_type_goes_through_all_15(db, bytes_loaded):
    seen = {byte_for_today(db, DAY + timedelta(days=i), "fact").id for i in range(15)}
    assert len(seen) == 15


def test_no_bytes_returns_none(db):
    assert byte_for_today(db, DAY) is None


# ---------- API ----------

def test_byte_api(client, auth_headers, bytes_loaded):
    first = client.get("/byte/today", headers=auth_headers).json()
    assert {"id", "type", "title", "content", "why_it_matters", "topic"} <= first.keys()
    assert client.get("/byte/today", headers=auth_headers).json()["id"] == first["id"]

    app.dependency_overrides[get_today] = lambda: DAY + timedelta(days=1)
    assert client.get("/byte/today", headers=auth_headers).json()["id"] != first["id"]


def test_byte_api_type_filter(client, auth_headers, bytes_loaded):
    assert client.get("/byte/today", headers=auth_headers, params={"type": "code"}).json()["type"] == "code"
    assert client.get("/byte/today", headers=auth_headers, params={"type": "fact"}).json()["type"] == "fact"
    assert client.get("/byte/today", headers=auth_headers, params={"type": "joke"}).status_code == 422


def test_byte_api_404_when_empty(client, auth_headers):
    assert client.get("/byte/today", headers=auth_headers).status_code == 404


def test_byte_needs_login(client):
    assert client.get("/byte/today").status_code == 401


def test_offset_gives_the_next_byte(db, bytes_loaded):
    tomorrow = byte_for_today(db, DAY + timedelta(days=1), "code")
    assert byte_for_today(db, DAY, "code", offset=1).id == tomorrow.id
    assert byte_for_today(db, DAY, "code", offset=15).id == byte_for_today(db, DAY, "code").id  # wraps around


def test_byte_api_offset(client, auth_headers, bytes_loaded):
    today_byte = client.get("/byte/today", headers=auth_headers).json()
    next_byte = client.get("/byte/today", headers=auth_headers, params={"offset": 1}).json()
    assert next_byte["id"] != today_byte["id"]
    assert client.get("/byte/today", headers=auth_headers, params={"offset": -1}).status_code == 422
