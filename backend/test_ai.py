from unittest.mock import MagicMock, patch


def _mock_claude_response(response_text: str, board_update=None):
    tool_input = {"response": response_text}
    if board_update:
        tool_input["board_update"] = board_update

    content_block = MagicMock()
    content_block.input = tool_input

    result = MagicMock()
    result.content = [content_block]
    return result


def test_ai_test_no_api_key(client, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    response = client.post("/api/ai/test")
    assert response.status_code == 500


def test_ai_test_calls_claude(client, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    mock_result = MagicMock()
    mock_result.content = [MagicMock(text="4")]

    with patch("ai.anthropic.Anthropic") as MockClient:
        MockClient.return_value.messages.create.return_value = mock_result
        response = client.post("/api/ai/test")

    assert response.status_code == 200
    assert response.json()["result"] == "4"


def test_ai_chat_unauthenticated(client):
    client.cookies.clear()
    response = client.post("/api/ai/chat", json={"messages": [{"role": "user", "content": "hi"}]})
    assert response.status_code == 401


def test_ai_chat_no_board_update(client, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    mock_result = _mock_claude_response("No changes needed.")

    with patch("ai.anthropic.Anthropic") as MockClient:
        MockClient.return_value.messages.create.return_value = mock_result
        response = client.post("/api/ai/chat", json={"messages": [{"role": "user", "content": "How many columns?"}]})

    assert response.status_code == 200
    data = response.json()
    assert data["response"] == "No changes needed."
    assert data["board_update"] is None
    assert len(data["board"]["columns"]) == 5


def test_ai_chat_with_board_update(client, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

    # Fetch the real column IDs (they now include board_id suffix)
    board = client.get("/api/board").json()
    cols = {c["title"]: c["id"] for c in board["columns"]}

    board_update = {
        "columns": [
            {"id": cols["Backlog"], "title": "Backlog", "cardIds": ["card-abc123"]},
            {"id": cols["Discovery"], "title": "Discovery", "cardIds": []},
            {"id": cols["In Progress"], "title": "In Progress", "cardIds": []},
            {"id": cols["Review"], "title": "Review", "cardIds": []},
            {"id": cols["Done"], "title": "Done", "cardIds": []},
        ],
        "cards": {
            "card-abc123": {"id": "card-abc123", "title": "New task", "details": "From AI"},
        },
    }
    mock_result = _mock_claude_response("I added a card.", board_update)

    with patch("ai.anthropic.Anthropic") as MockClient:
        MockClient.return_value.messages.create.return_value = mock_result
        response = client.post("/api/ai/chat", json={"messages": [{"role": "user", "content": "Add a task"}]})

    assert response.status_code == 200
    data = response.json()
    assert data["response"] == "I added a card."
    assert data["board_update"] is not None
    assert "card-abc123" in data["board"]["cards"]
    assert data["board"]["cards"]["card-abc123"]["title"] == "New task"
    assert "card-abc123" in data["board"]["columns"][0]["cardIds"]


def test_ai_chat_passes_conversation_history(client, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    mock_result = _mock_claude_response("Got it.")

    with patch("ai.anthropic.Anthropic") as MockClient:
        MockClient.return_value.messages.create.return_value = mock_result
        client.post("/api/ai/chat", json={
            "messages": [
                {"role": "user", "content": "First message"},
                {"role": "assistant", "content": "First reply"},
                {"role": "user", "content": "Second message"},
            ]
        })
        call_kwargs = MockClient.return_value.messages.create.call_args.kwargs
        assert len(call_kwargs["messages"]) == 3
