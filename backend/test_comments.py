import pytest
from fastapi.testclient import TestClient
import database
import auth
from main import app


@pytest.fixture
def client(tmp_path):
    database.DB_PATH = tmp_path / "test.db"
    database.init_db()
    auth._sessions.clear()
    c = TestClient(app)
    c.post("/api/auth/login", json={"username": "user", "password": "password"})
    c.get("/api/board")
    yield c
    auth._sessions.clear()


def _make_card(client, title="Test card", details=""):
    board = client.get("/api/board").json()
    col_id = board["columns"][0]["id"]
    resp = client.post("/api/cards", json={"columnId": col_id, "title": title, "details": details})
    assert resp.status_code == 200
    return resp.json()


# ─── Assignee tests ────────────────────────────────────────────────────────────

def test_create_card_with_assignee(client):
    card = _make_card(client)
    # Update with assignee
    r = client.put(f"/api/cards/{card['id']}", json={
        "title": card["title"],
        "details": card["details"],
        "importance": "medium",
        "assignee": "alice",
    })
    assert r.status_code == 200
    board = client.get("/api/board").json()
    updated = board["cards"][card["id"]]
    assert updated["assignee"] == "alice"


def test_assignee_defaults_to_null(client):
    card = _make_card(client, "No assignee card")
    assert card["assignee"] is None


def test_assignee_returned_in_board_data(client):
    card = _make_card(client, "Assigned card")
    client.put(f"/api/cards/{card['id']}", json={
        "title": card["title"],
        "details": "",
        "importance": "medium",
        "assignee": "bob",
    })
    board = client.get("/api/board").json()
    assert board["cards"][card["id"]]["assignee"] == "bob"


def test_assignee_cleared_when_null(client):
    card = _make_card(client, "Clearable card")
    client.put(f"/api/cards/{card['id']}", json={
        "title": card["title"], "details": "", "importance": "medium", "assignee": "carol"
    })
    client.put(f"/api/cards/{card['id']}", json={
        "title": card["title"], "details": "", "importance": "medium", "assignee": None
    })
    board = client.get("/api/board").json()
    assert board["cards"][card["id"]]["assignee"] is None


def test_create_card_endpoint_accepts_assignee(client):
    board = client.get("/api/board").json()
    col_id = board["columns"][0]["id"]
    r = client.post("/api/cards", json={
        "columnId": col_id,
        "title": "Assigned at creation",
        "details": "",
        "assignee": "dave",
    })
    assert r.status_code == 200
    assert r.json()["assignee"] == "dave"


# ─── Comment tests ─────────────────────────────────────────────────────────────

def test_list_comments_empty(client):
    card = _make_card(client, "Comment target")
    r = client.get(f"/api/cards/{card['id']}/comments")
    assert r.status_code == 200
    assert r.json() == []


def test_create_and_list_comment(client):
    card = _make_card(client, "Card with comment")
    r = client.post(f"/api/cards/{card['id']}/comments", json={"text": "Hello!"})
    assert r.status_code == 200
    data = r.json()
    assert data["text"] == "Hello!"
    assert data["username"] == "user"
    assert "createdAt" in data
    assert "id" in data

    comments = client.get(f"/api/cards/{card['id']}/comments").json()
    assert len(comments) == 1
    assert comments[0]["text"] == "Hello!"


def test_multiple_comments_ordered(client):
    card = _make_card(client, "Multi-comment card")
    client.post(f"/api/cards/{card['id']}/comments", json={"text": "First"})
    client.post(f"/api/cards/{card['id']}/comments", json={"text": "Second"})
    client.post(f"/api/cards/{card['id']}/comments", json={"text": "Third"})
    comments = client.get(f"/api/cards/{card['id']}/comments").json()
    assert len(comments) == 3
    assert [c["text"] for c in comments] == ["First", "Second", "Third"]


def test_delete_comment(client):
    card = _make_card(client, "Delete comment card")
    comment = client.post(f"/api/cards/{card['id']}/comments", json={"text": "To delete"}).json()
    r = client.delete(f"/api/cards/{card['id']}/comments/{comment['id']}")
    assert r.status_code == 200
    comments = client.get(f"/api/cards/{card['id']}/comments").json()
    assert comments == []


def test_comment_count_in_board_data(client):
    card = _make_card(client, "Count comments card")
    assert card["commentCount"] == 0
    client.post(f"/api/cards/{card['id']}/comments", json={"text": "One"})
    client.post(f"/api/cards/{card['id']}/comments", json={"text": "Two"})
    board = client.get("/api/board").json()
    assert board["cards"][card["id"]]["commentCount"] == 2


def test_comments_cascade_delete_with_card(client):
    card = _make_card(client, "Cascade card")
    client.post(f"/api/cards/{card['id']}/comments", json={"text": "Will be deleted"})
    client.delete(f"/api/cards/{card['id']}")
    # Should not raise — comments are gone
    with database.get_conn() as conn:
        count = conn.execute("SELECT COUNT(*) FROM comments WHERE card_id = ?", (card["id"],)).fetchone()[0]
    assert count == 0


def test_comments_cascade_delete_with_column(client):
    board = client.get("/api/board").json()
    # Create an extra column so we can delete one
    new_col = client.post("/api/columns", json={"title": "Temp"}).json()
    card_r = client.post("/api/cards", json={"columnId": new_col["id"], "title": "Card in temp"})
    card_id = card_r.json()["id"]
    client.post(f"/api/cards/{card_id}/comments", json={"text": "orphan comment"})
    client.delete(f"/api/columns/{new_col['id']}")
    with database.get_conn() as conn:
        count = conn.execute("SELECT COUNT(*) FROM comments WHERE card_id = ?", (card_id,)).fetchone()[0]
    assert count == 0
