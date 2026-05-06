def test_get_board_unauthenticated(client):
    client.cookies.clear()
    response = client.get("/api/board")
    assert response.status_code == 401


def test_get_board_returns_five_columns(client):
    response = client.get("/api/board")
    assert response.status_code == 200
    data = response.json()
    assert len(data["columns"]) == 5
    assert data["columns"][0]["id"] == "col-backlog"
    assert data["columns"][0]["title"] == "Backlog"
    assert data["columns"][0]["cardIds"] == []


def test_get_board_idempotent(client):
    r1 = client.get("/api/board")
    r2 = client.get("/api/board")
    assert r1.json() == r2.json()


def test_rename_column(client):
    response = client.put("/api/columns/col-backlog", json={"title": "Todo"})
    assert response.status_code == 200
    board = client.get("/api/board").json()
    assert board["columns"][0]["title"] == "Todo"


def test_create_card(client):
    response = client.post("/api/cards", json={"columnId": "col-backlog", "title": "My card", "details": "Details"})
    assert response.status_code == 200
    card = response.json()
    assert card["title"] == "My card"
    assert card["details"] == "Details"
    assert card["id"].startswith("card-")

    board = client.get("/api/board").json()
    assert card["id"] in board["columns"][0]["cardIds"]
    assert board["cards"][card["id"]]["title"] == "My card"


def test_create_card_default_details(client):
    response = client.post("/api/cards", json={"columnId": "col-backlog", "title": "No details"})
    assert response.status_code == 200
    assert response.json()["details"] == ""


def test_update_card(client):
    card_id = client.post("/api/cards", json={"columnId": "col-backlog", "title": "Old", "details": "x"}).json()["id"]
    response = client.put(f"/api/cards/{card_id}", json={"title": "New", "details": "y"})
    assert response.status_code == 200
    board = client.get("/api/board").json()
    assert board["cards"][card_id]["title"] == "New"
    assert board["cards"][card_id]["details"] == "y"


def test_delete_card(client):
    card_id = client.post("/api/cards", json={"columnId": "col-backlog", "title": "Temp"}).json()["id"]
    response = client.delete(f"/api/cards/{card_id}")
    assert response.status_code == 200
    board = client.get("/api/board").json()
    assert card_id not in board["cards"]
    assert card_id not in board["columns"][0]["cardIds"]


def test_delete_card_updates_positions(client):
    ids = [
        client.post("/api/cards", json={"columnId": "col-backlog", "title": f"Card {i}"}).json()["id"]
        for i in range(3)
    ]
    client.delete(f"/api/cards/{ids[0]}")
    board = client.get("/api/board").json()
    assert board["columns"][0]["cardIds"] == [ids[1], ids[2]]


def test_move_card_same_column(client):
    ids = [
        client.post("/api/cards", json={"columnId": "col-backlog", "title": f"Card {i}"}).json()["id"]
        for i in range(3)
    ]
    client.post(f"/api/cards/{ids[2]}/move", json={"columnId": "col-backlog", "position": 0})
    board = client.get("/api/board").json()
    assert board["columns"][0]["cardIds"] == [ids[2], ids[0], ids[1]]


def test_move_card_cross_column(client):
    card_id = client.post("/api/cards", json={"columnId": "col-backlog", "title": "Move me"}).json()["id"]
    client.post(f"/api/cards/{card_id}/move", json={"columnId": "col-done", "position": 0})
    board = client.get("/api/board").json()
    assert card_id not in board["columns"][0]["cardIds"]
    assert board["columns"][4]["cardIds"][0] == card_id
