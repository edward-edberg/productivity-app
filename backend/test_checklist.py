import pytest


def get_first_column_id(client):
    return client.get("/api/board").json()["columns"][0]["id"]


def create_card(client, col_id, title="Test Card"):
    return client.post(
        "/api/cards",
        json={"columnId": col_id, "title": title, "details": ""},
    ).json()["id"]


# ─── Checklist tests ────────────────────────────────────────────────────────────

def test_add_checklist_item(client):
    col_id = get_first_column_id(client)
    card_id = create_card(client, col_id)
    res = client.post(f"/api/cards/{card_id}/checklist", json={"text": "Do something"})
    assert res.status_code == 200
    item = res.json()
    assert item["text"] == "Do something"
    assert item["checked"] is False
    assert "id" in item


def test_list_checklist_items(client):
    col_id = get_first_column_id(client)
    card_id = create_card(client, col_id)
    client.post(f"/api/cards/{card_id}/checklist", json={"text": "Item 1"})
    client.post(f"/api/cards/{card_id}/checklist", json={"text": "Item 2"})
    res = client.get(f"/api/cards/{card_id}/checklist")
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 2
    assert items[0]["text"] == "Item 1"
    assert items[1]["text"] == "Item 2"


def test_update_checklist_item(client):
    col_id = get_first_column_id(client)
    card_id = create_card(client, col_id)
    item = client.post(f"/api/cards/{card_id}/checklist", json={"text": "Old text"}).json()
    res = client.put(f"/api/cards/{card_id}/checklist/{item['id']}", json={"text": "New text", "checked": True})
    assert res.status_code == 200
    items = client.get(f"/api/cards/{card_id}/checklist").json()
    assert items[0]["text"] == "New text"
    assert items[0]["checked"] is True


def test_delete_checklist_item(client):
    col_id = get_first_column_id(client)
    card_id = create_card(client, col_id)
    item = client.post(f"/api/cards/{card_id}/checklist", json={"text": "To delete"}).json()
    res = client.delete(f"/api/cards/{card_id}/checklist/{item['id']}")
    assert res.status_code == 200
    items = client.get(f"/api/cards/{card_id}/checklist").json()
    assert len(items) == 0


def test_checklist_in_board_data(client):
    col_id = get_first_column_id(client)
    card_id = create_card(client, col_id)
    client.post(f"/api/cards/{card_id}/checklist", json={"text": "Step 1"})
    client.post(f"/api/cards/{card_id}/checklist", json={"text": "Step 2"})
    board = client.get("/api/board").json()
    card = board["cards"][card_id]
    assert "checklistItems" in card
    assert len(card["checklistItems"]) == 2
    assert card["checklistItems"][0]["text"] == "Step 1"
    assert card["checklistItems"][1]["checked"] is False


def test_delete_card_cascades_checklist(client):
    col_id = get_first_column_id(client)
    card_id = create_card(client, col_id)
    client.post(f"/api/cards/{card_id}/checklist", json={"text": "Should be deleted"})
    client.delete(f"/api/cards/{card_id}")
    # Checklist items should be gone (no 500 error on board fetch)
    board = client.get("/api/board")
    assert board.status_code == 200


def test_delete_column_cascades_checklist(client):
    col_id = get_first_column_id(client)
    card_id = create_card(client, col_id)
    client.post(f"/api/cards/{card_id}/checklist", json={"text": "Cascaded item"})
    # Create a second column to avoid "last column" guard
    new_col = client.post("/api/columns", json={"title": "Temp"}).json()
    client.delete(f"/api/columns/{col_id}")
    board = client.get("/api/board")
    assert board.status_code == 200


# ─── Story points tests ─────────────────────────────────────────────────────────

def test_create_card_with_story_points(client):
    col_id = get_first_column_id(client)
    res = client.post("/api/cards", json={"columnId": col_id, "title": "Pointed", "details": "", "storyPoints": 5})
    assert res.status_code == 200
    assert res.json()["storyPoints"] == 5


def test_update_card_story_points(client):
    col_id = get_first_column_id(client)
    card_id = create_card(client, col_id)
    client.put(f"/api/cards/{card_id}", json={"title": "T", "details": "", "storyPoints": 8})
    board = client.get("/api/board").json()
    assert board["cards"][card_id]["storyPoints"] == 8


def test_story_points_in_board_data(client):
    col_id = get_first_column_id(client)
    res = client.post("/api/cards", json={"columnId": col_id, "title": "SP Card", "details": "", "storyPoints": 3})
    card_id = res.json()["id"]
    board = client.get("/api/board").json()
    assert board["cards"][card_id]["storyPoints"] == 3


def test_story_points_null_by_default(client):
    col_id = get_first_column_id(client)
    card_id = create_card(client, col_id)
    board = client.get("/api/board").json()
    assert board["cards"][card_id]["storyPoints"] is None


# ─── WIP limit tests ────────────────────────────────────────────────────────────

def test_set_wip_limit(client):
    col_id = get_first_column_id(client)
    res = client.put(f"/api/columns/{col_id}/wip-limit", json={"wipLimit": 3})
    assert res.status_code == 200
    board = client.get("/api/board").json()
    col = next(c for c in board["columns"] if c["id"] == col_id)
    assert col["wipLimit"] == 3


def test_clear_wip_limit(client):
    col_id = get_first_column_id(client)
    client.put(f"/api/columns/{col_id}/wip-limit", json={"wipLimit": 3})
    client.put(f"/api/columns/{col_id}/wip-limit", json={"wipLimit": None})
    board = client.get("/api/board").json()
    col = next(c for c in board["columns"] if c["id"] == col_id)
    assert col["wipLimit"] is None


def test_wip_limit_in_board_data(client):
    board = client.get("/api/board").json()
    # All columns start with null wip limit
    for col in board["columns"]:
        assert "wipLimit" in col
        assert col["wipLimit"] is None
