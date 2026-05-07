import pytest


def _first_col(client):
    board = client.get("/api/board").json()
    return board["columns"][0]["id"]


def _last_col(client):
    board = client.get("/api/board").json()
    return board["columns"][-1]["id"]


def test_get_board_unauthenticated(client):
    client.cookies.clear()
    response = client.get("/api/board")
    assert response.status_code == 401


def test_get_board_returns_five_columns(client):
    response = client.get("/api/board")
    assert response.status_code == 200
    data = response.json()
    assert len(data["columns"]) == 5
    assert data["columns"][0]["title"] == "Backlog"
    assert data["columns"][0]["cardIds"] == []
    assert "id" in data
    assert "name" in data


def test_get_board_idempotent(client):
    r1 = client.get("/api/board")
    r2 = client.get("/api/board")
    assert r1.json() == r2.json()


def test_rename_column(client):
    col_id = _first_col(client)
    response = client.put(f"/api/columns/{col_id}", json={"title": "Todo"})
    assert response.status_code == 200
    board = client.get("/api/board").json()
    assert board["columns"][0]["title"] == "Todo"


def test_create_card(client):
    col_id = _first_col(client)
    response = client.post("/api/cards", json={"columnId": col_id, "title": "My card", "details": "Details"})
    assert response.status_code == 200
    card = response.json()
    assert card["title"] == "My card"
    assert card["details"] == "Details"
    assert card["id"].startswith("card-")
    assert card["importance"] == "medium"

    board = client.get("/api/board").json()
    assert card["id"] in board["columns"][0]["cardIds"]
    assert board["cards"][card["id"]]["title"] == "My card"


def test_create_card_default_details(client):
    col_id = _first_col(client)
    response = client.post("/api/cards", json={"columnId": col_id, "title": "No details"})
    assert response.status_code == 200
    assert response.json()["details"] == ""


def test_create_card_with_importance(client):
    col_id = _first_col(client)
    response = client.post("/api/cards", json={"columnId": col_id, "title": "Urgent", "importance": "high"})
    assert response.status_code == 200
    assert response.json()["importance"] == "high"


def test_create_card_with_due_date(client):
    col_id = _first_col(client)
    response = client.post("/api/cards", json={"columnId": col_id, "title": "Deadline", "dueDate": "2026-06-01"})
    assert response.status_code == 200
    card = response.json()
    assert card["dueDate"] == "2026-06-01"


def test_update_card(client):
    col_id = _first_col(client)
    card_id = client.post("/api/cards", json={"columnId": col_id, "title": "Old", "details": "x"}).json()["id"]
    response = client.put(f"/api/cards/{card_id}", json={"title": "New", "details": "y", "importance": "high"})
    assert response.status_code == 200
    board = client.get("/api/board").json()
    assert board["cards"][card_id]["title"] == "New"
    assert board["cards"][card_id]["details"] == "y"
    assert board["cards"][card_id]["importance"] == "high"


def test_delete_card(client):
    col_id = _first_col(client)
    card_id = client.post("/api/cards", json={"columnId": col_id, "title": "Temp"}).json()["id"]
    response = client.delete(f"/api/cards/{card_id}")
    assert response.status_code == 200
    board = client.get("/api/board").json()
    assert card_id not in board["cards"]
    assert card_id not in board["columns"][0]["cardIds"]


def test_delete_card_updates_positions(client):
    col_id = _first_col(client)
    ids = [
        client.post("/api/cards", json={"columnId": col_id, "title": f"Card {i}"}).json()["id"]
        for i in range(3)
    ]
    client.delete(f"/api/cards/{ids[0]}")
    board = client.get("/api/board").json()
    assert board["columns"][0]["cardIds"] == [ids[1], ids[2]]


def test_move_card_same_column(client):
    col_id = _first_col(client)
    ids = [
        client.post("/api/cards", json={"columnId": col_id, "title": f"Card {i}"}).json()["id"]
        for i in range(3)
    ]
    client.post(f"/api/cards/{ids[2]}/move", json={"columnId": col_id, "position": 0})
    board = client.get("/api/board").json()
    assert board["columns"][0]["cardIds"] == [ids[2], ids[0], ids[1]]


def test_move_card_cross_column(client):
    col_id = _first_col(client)
    last_col = _last_col(client)
    card_id = client.post("/api/cards", json={"columnId": col_id, "title": "Move me"}).json()["id"]
    client.post(f"/api/cards/{card_id}/move", json={"columnId": last_col, "position": 0})
    board = client.get("/api/board").json()
    assert card_id not in board["columns"][0]["cardIds"]
    assert board["columns"][4]["cardIds"][0] == card_id


def test_list_boards(client):
    response = client.get("/api/boards")
    assert response.status_code == 200
    boards = response.json()
    assert isinstance(boards, list)
    assert len(boards) >= 1
    assert "name" in boards[0]


def test_create_and_rename_board(client):
    r = client.post("/api/boards", json={"name": "Sprint Board"})
    assert r.status_code == 200
    bid = r.json()["id"]
    r2 = client.put(f"/api/boards/{bid}", json={"name": "Renamed Board"})
    assert r2.status_code == 200
    boards = client.get("/api/boards").json()
    names = [b["name"] for b in boards]
    assert "Renamed Board" in names


def test_cannot_delete_only_board(client):
    boards = client.get("/api/boards").json()
    assert len(boards) == 1
    r = client.delete(f"/api/boards/{boards[0]['id']}")
    assert r.status_code == 400


def test_delete_second_board(client):
    r = client.post("/api/boards", json={"name": "Extra"})
    bid = r.json()["id"]
    r2 = client.delete(f"/api/boards/{bid}")
    assert r2.status_code == 200
    boards = client.get("/api/boards").json()
    assert all(b["id"] != bid for b in boards)


def test_board_isolation_by_board_id(client):
    b1 = client.get("/api/board").json()
    r2 = client.post("/api/boards", json={"name": "Board 2"})
    bid2 = r2.json()["id"]
    b2 = client.get(f"/api/board?boardId={bid2}").json()
    assert b1["id"] != b2["id"]

    col2 = b2["columns"][0]["id"]
    client.post(f"/api/cards?boardId={bid2}", json={"columnId": col2, "title": "Only on B2"})
    b1_refreshed = client.get("/api/board").json()
    b2_refreshed = client.get(f"/api/board?boardId={bid2}").json()

    b1_titles = [c["title"] for c in b1_refreshed["cards"].values()]
    b2_titles = [c["title"] for c in b2_refreshed["cards"].values()]
    assert "Only on B2" not in b1_titles
    assert "Only on B2" in b2_titles
