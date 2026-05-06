import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_me_unauthenticated():
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_login_wrong_password():
    response = client.post("/api/auth/login", json={"username": "user", "password": "wrong"})
    assert response.status_code == 401


def test_login_wrong_username():
    response = client.post("/api/auth/login", json={"username": "admin", "password": "password"})
    assert response.status_code == 401


def test_login_success():
    response = client.post("/api/auth/login", json={"username": "user", "password": "password"})
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert "session" in response.cookies


def test_me_authenticated():
    client.post("/api/auth/login", json={"username": "user", "password": "password"})
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json() == {"username": "user"}


def test_logout():
    client.post("/api/auth/login", json={"username": "user", "password": "password"})
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    response = client.get("/api/auth/me")
    assert response.status_code == 401
