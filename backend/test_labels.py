def _first_col(client):
    board = client.get("/api/board").json()
    return board["columns"][0]["id"]


def test_create_and_list_labels(client):
    r = client.post("/api/labels", json={"name": "Bug", "color": "#ef4444"})
    assert r.status_code == 200
    label = r.json()
    assert label["name"] == "Bug"
    assert label["color"] == "#ef4444"
    assert label["id"].startswith("label-")

    labels = client.get("/api/labels").json()
    assert any(l["id"] == label["id"] for l in labels)


def test_update_label(client):
    label_id = client.post("/api/labels", json={"name": "Old", "color": "#111111"}).json()["id"]
    r = client.put(f"/api/labels/{label_id}", json={"name": "New", "color": "#222222"})
    assert r.status_code == 200
    labels = client.get("/api/labels").json()
    updated = next(l for l in labels if l["id"] == label_id)
    assert updated["name"] == "New"
    assert updated["color"] == "#222222"


def test_delete_label(client):
    label_id = client.post("/api/labels", json={"name": "Temp", "color": "#000000"}).json()["id"]
    r = client.delete(f"/api/labels/{label_id}")
    assert r.status_code == 200
    labels = client.get("/api/labels").json()
    assert all(l["id"] != label_id for l in labels)


def test_board_data_includes_labels(client):
    client.post("/api/labels", json={"name": "Feature", "color": "#3b82f6"})
    board = client.get("/api/board").json()
    assert "labels" in board
    assert any(l["name"] == "Feature" for l in board["labels"])


def test_card_labels_set_and_clear(client):
    col_id = _first_col(client)
    card_id = client.post("/api/cards", json={"columnId": col_id, "title": "T"}).json()["id"]
    label_id = client.post("/api/labels", json={"name": "X", "color": "#ff0000"}).json()["id"]

    r = client.put(f"/api/cards/{card_id}/labels", json={"labelIds": [label_id]})
    assert r.status_code == 200

    board = client.get("/api/board").json()
    assert label_id in board["cards"][card_id]["labelIds"]

    r2 = client.put(f"/api/cards/{card_id}/labels", json={"labelIds": []})
    assert r2.status_code == 200
    board2 = client.get("/api/board").json()
    assert board2["cards"][card_id]["labelIds"] == []


def test_create_card_with_label_ids(client):
    col_id = _first_col(client)
    label_id = client.post("/api/labels", json={"name": "L1", "color": "#aaa"}).json()["id"]
    r = client.post("/api/cards", json={"columnId": col_id, "title": "T", "labelIds": [label_id]})
    assert r.status_code == 200
    card = r.json()
    assert label_id in card["labelIds"]
    board = client.get("/api/board").json()
    assert label_id in board["cards"][card["id"]]["labelIds"]


def test_update_card_with_label_ids(client):
    col_id = _first_col(client)
    card_id = client.post("/api/cards", json={"columnId": col_id, "title": "T"}).json()["id"]
    label_id = client.post("/api/labels", json={"name": "L2", "color": "#bbb"}).json()["id"]

    client.put(f"/api/cards/{card_id}", json={"title": "T", "details": "", "labelIds": [label_id]})
    board = client.get("/api/board").json()
    assert label_id in board["cards"][card_id]["labelIds"]


def test_delete_label_removes_from_cards(client):
    col_id = _first_col(client)
    card_id = client.post("/api/cards", json={"columnId": col_id, "title": "T"}).json()["id"]
    label_id = client.post("/api/labels", json={"name": "L3", "color": "#ccc"}).json()["id"]
    client.put(f"/api/cards/{card_id}/labels", json={"labelIds": [label_id]})

    client.delete(f"/api/labels/{label_id}")
    board = client.get("/api/board").json()
    assert label_id not in board["cards"][card_id]["labelIds"]


def test_create_column(client):
    r = client.post("/api/columns", json={"title": "New Column"})
    assert r.status_code == 200
    col = r.json()
    assert col["title"] == "New Column"
    assert col["cardIds"] == []

    board = client.get("/api/board").json()
    assert any(c["id"] == col["id"] for c in board["columns"])


def test_delete_column(client):
    r = client.post("/api/columns", json={"title": "Temp Col"})
    col_id = r.json()["id"]
    r2 = client.delete(f"/api/columns/{col_id}")
    assert r2.status_code == 200

    board = client.get("/api/board").json()
    assert all(c["id"] != col_id for c in board["columns"])


def test_cannot_delete_last_column(client):
    board = client.get("/api/board").json()
    cols = board["columns"]
    # delete all but one
    for col in cols[1:]:
        client.delete(f"/api/columns/{col['id']}")
    r = client.delete(f"/api/columns/{cols[0]['id']}")
    assert r.status_code == 400


def test_delete_column_cascades_cards(client):
    r = client.post("/api/columns", json={"title": "To Delete"})
    col_id = r.json()["id"]
    card_id = client.post("/api/cards", json={"columnId": col_id, "title": "Orphan"}).json()["id"]
    client.delete(f"/api/columns/{col_id}")
    board = client.get("/api/board").json()
    assert card_id not in board["cards"]
