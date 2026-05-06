import json
import os

import anthropic
from fastapi import APIRouter, Cookie, Depends, HTTPException
from pydantic import BaseModel

import database as db
from auth import SESSION_TOKEN, VALID_TOKEN
from board import require_board_id

router = APIRouter(prefix="/api/ai")

MODEL = "claude-opus-4-7"

RESPOND_TOOL = {
    "name": "respond",
    "description": "Respond to the user and optionally update the board",
    "input_schema": {
        "type": "object",
        "properties": {
            "response": {"type": "string"},
            "board_update": {
                "type": "object",
                "description": "Complete updated board state. Only include if the board should change.",
                "properties": {
                    "columns": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "title": {"type": "string"},
                                "cardIds": {"type": "array", "items": {"type": "string"}},
                            },
                            "required": ["id", "title", "cardIds"],
                        },
                    },
                    "cards": {
                        "type": "object",
                        "additionalProperties": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "title": {"type": "string"},
                                "details": {"type": "string"},
                            },
                            "required": ["id", "title", "details"],
                        },
                    },
                },
                "required": ["columns", "cards"],
            },
        },
        "required": ["response"],
    },
}

SYSTEM_PROMPT = """You are an AI assistant for Kanban Studio, a project management app.

The user's current board:
{board_json}

You help users manage their Kanban board. You can create, move, rename, or delete cards.

Rules:
- Always provide a "response" message to the user.
- If the board should change, include a complete "board_update" with the full updated board state.
- If no board changes are needed, omit "board_update".
- Keep existing column IDs exactly as given.
- For new cards, generate IDs in the format "card-XXXXXX" (6 random alphanumeric chars).
- Preserve all existing cards unless the user asks to remove them.
- The order of cardIds in each column determines card position."""


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]


@router.post("/test")
def ai_test():
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")
    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model=MODEL,
        max_tokens=16,
        messages=[{"role": "user", "content": "What is 2+2? Reply with just the number."}],
    )
    return {"result": message.content[0].text.strip()}


@router.post("/chat")
def ai_chat(body: ChatRequest, board_id: int = Depends(require_board_id)):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

    board_data = db.get_board_data(board_id)
    system = SYSTEM_PROMPT.format(board_json=json.dumps(board_data, indent=2))

    client = anthropic.Anthropic(api_key=api_key)
    result = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=system,
        tools=[RESPOND_TOOL],
        tool_choice={"type": "tool", "name": "respond"},
        messages=[{"role": m.role, "content": m.content} for m in body.messages],
    )

    tool_input = result.content[0].input
    response_text = tool_input.get("response", "")
    board_update = tool_input.get("board_update")

    if board_update:
        db.apply_board_update(board_id, board_update)
        board_data = db.get_board_data(board_id)

    return {"response": response_text, "board_update": board_update, "board": board_data}
