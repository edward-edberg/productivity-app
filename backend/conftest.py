import pytest
from fastapi.testclient import TestClient

import database
from main import app


@pytest.fixture
def client(tmp_path):
    database.DB_PATH = tmp_path / "test.db"
    database.init_db()
    c = TestClient(app)
    c.post("/api/auth/login", json={"username": "user", "password": "password"})
    yield c
