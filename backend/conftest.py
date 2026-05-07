import pytest
from fastapi.testclient import TestClient

import auth
import database
from main import app


@pytest.fixture
def client(tmp_path):
    database.DB_PATH = tmp_path / "test.db"
    database.init_db()  # seeds default "user"/"password" account
    auth._sessions.clear()
    c = TestClient(app)
    c.post("/api/auth/login", json={"username": "user", "password": "password"})
    c.get("/api/board")  # ensure default board is initialized
    yield c
    auth._sessions.clear()
