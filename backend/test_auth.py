import pytest
from fastapi.testclient import TestClient

import auth
import database
from main import app


@pytest.fixture
def anon(tmp_path):
    database.DB_PATH = tmp_path / "test.db"
    database.init_db()  # seeds default "user"/"password" account
    auth._sessions.clear()
    yield TestClient(app)
    auth._sessions.clear()


def test_me_unauthenticated(anon):
    response = anon.get("/api/auth/me")
    assert response.status_code == 401


def test_login_wrong_password(anon):
    response = anon.post("/api/auth/login", json={"username": "user", "password": "wrong"})
    assert response.status_code == 401


def test_login_wrong_username(anon):
    response = anon.post("/api/auth/login", json={"username": "nobody", "password": "password"})
    assert response.status_code == 401


def test_login_success(anon):
    response = anon.post("/api/auth/login", json={"username": "user", "password": "password"})
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert "session" in response.cookies


def test_me_authenticated(anon):
    anon.post("/api/auth/login", json={"username": "user", "password": "password"})
    response = anon.get("/api/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "user"
    assert "id" in data


def test_logout(anon):
    anon.post("/api/auth/login", json={"username": "user", "password": "password"})
    response = anon.post("/api/auth/logout")
    assert response.status_code == 200
    response = anon.get("/api/auth/me")
    assert response.status_code == 401


def test_register_success(anon):
    response = anon.post("/api/auth/register", json={"username": "newuser", "password": "secret123"})
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    r = anon.post("/api/auth/login", json={"username": "newuser", "password": "secret123"})
    assert r.status_code == 200


def test_register_duplicate_username(anon):
    response = anon.post("/api/auth/register", json={"username": "user", "password": "secret123"})
    assert response.status_code == 409


def test_register_short_password(anon):
    response = anon.post("/api/auth/register", json={"username": "alice", "password": "abc"})
    assert response.status_code == 422


def test_register_short_username(anon):
    response = anon.post("/api/auth/register", json={"username": "x", "password": "secret123"})
    assert response.status_code == 422


def test_change_password(anon):
    anon.post("/api/auth/login", json={"username": "user", "password": "password"})
    r = anon.put("/api/auth/me/password", json={"current_password": "password", "new_password": "newpass123"})
    assert r.status_code == 200
    anon.post("/api/auth/logout")
    r2 = anon.post("/api/auth/login", json={"username": "user", "password": "newpass123"})
    assert r2.status_code == 200


def test_change_password_wrong_current(anon):
    anon.post("/api/auth/login", json={"username": "user", "password": "password"})
    r = anon.put("/api/auth/me/password", json={"current_password": "wrong", "new_password": "newpass123"})
    assert r.status_code == 401


def test_multiple_users_isolated(tmp_path):
    database.DB_PATH = tmp_path / "test.db"
    database.init_db()
    auth._sessions.clear()

    database.register_user("alice", "alicepass")
    database.register_user("bob", "bobpass")
    # note: "user" already exists from init_db seed

    c_alice = TestClient(app)
    c_alice.post("/api/auth/login", json={"username": "alice", "password": "alicepass"})
    c_alice.get("/api/board")  # trigger board creation
    c_bob = TestClient(app)
    c_bob.post("/api/auth/login", json={"username": "bob", "password": "bobpass"})
    c_bob.get("/api/board")

    c_alice.post("/api/cards", json={"columnId": _first_col(c_alice), "title": "Alice card"})
    alice_board = c_alice.get("/api/board").json()
    bob_board = c_bob.get("/api/board").json()

    alice_titles = [c["title"] for c in alice_board["cards"].values()]
    bob_titles = [c["title"] for c in bob_board["cards"].values()]
    assert "Alice card" in alice_titles
    assert "Alice card" not in bob_titles
    auth._sessions.clear()


def _first_col(client):
    board = client.get("/api/board").json()
    return board["columns"][0]["id"]
