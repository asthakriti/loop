from sqlalchemy import select

from app.core.security import create_access_token
from app.models import User, UserSettings, UserStats

EMAIL = "astha@example.com"
PASSWORD = "strongpass1"


def register(client, email=EMAIL, password=PASSWORD):
    return client.post("/auth/register", json={"email": email, "password": password})


def login(client, email=EMAIL, password=PASSWORD):
    return client.post("/auth/login", json={"email": email, "password": password})


def test_register_creates_user_with_default_settings_and_stats(client, db):
    response = register(client)
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == EMAIL
    assert "password" not in body and "password_hash" not in body

    user = db.scalar(select(User).where(User.email == EMAIL))
    assert user.password_hash != PASSWORD  # stored as a hash, never plain text
    settings = db.get(UserSettings, user.id)
    assert (settings.round_days, settings.max_daily, settings.new_per_day) == (30, 10, 2)
    assert db.get(UserStats, user.id).total_xp == 0


def test_register_same_email_twice_fails(client):
    register(client)
    response = register(client, email=EMAIL.upper())  # emails are not case sensitive
    assert response.status_code == 409


def test_register_short_password_fails(client):
    assert register(client, password="short").status_code == 422


def test_login_returns_token(client):
    register(client)
    response = login(client)
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["access_token"]


def test_login_wrong_password(client):
    register(client)
    response = login(client, password="wrongpass1")
    assert response.status_code == 401


def test_login_unknown_email(client):
    response = login(client, email="nobody@example.com")
    assert response.status_code == 401


def test_me_with_token(client):
    register(client)
    token = login(client).json()["access_token"]
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == EMAIL


def test_me_without_token_is_401(client):
    assert client.get("/auth/me").status_code == 401


def test_me_with_bad_token_is_401(client):
    response = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


def test_me_with_expired_token_is_401(client):
    user_id = register(client).json()["id"]
    token = create_access_token(user_id, expires_minutes=-1)
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
