from fastapi import APIRouter, Cookie, Depends, HTTPException
from pydantic import BaseModel

import database as db
from auth import SESSION_TOKEN, VALID_TOKEN

router = APIRouter(prefix="/api")


def require_board_id(session: str | None = Cookie(default=None)) -> int:
    if session != VALID_TOKEN:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = db.get_or_create_user("user")
    return db.get_or_create_board(user_id)


class RenameColumnBody(BaseModel):
    title: str


class CreateCardBody(BaseModel):
    columnId: str
    title: str
    details: str = ""


class UpdateCardBody(BaseModel):
    title: str
    details: str


class MoveCardBody(BaseModel):
    columnId: str
    position: int


@router.get("/board")
def get_board(board_id: int = Depends(require_board_id)):
    return db.get_board_data(board_id)


@router.put("/columns/{column_id}")
def rename_column(column_id: str, body: RenameColumnBody, board_id: int = Depends(require_board_id)):
    db.rename_column(column_id, body.title)
    return {"ok": True}


@router.post("/cards")
def create_card(body: CreateCardBody, board_id: int = Depends(require_board_id)):
    card = db.create_card(body.columnId, body.title, body.details)
    return card


@router.put("/cards/{card_id}")
def update_card(card_id: str, body: UpdateCardBody, board_id: int = Depends(require_board_id)):
    db.update_card(card_id, body.title, body.details)
    return {"ok": True}


@router.delete("/cards/{card_id}")
def delete_card(card_id: str, board_id: int = Depends(require_board_id)):
    db.delete_card(card_id)
    return {"ok": True}


@router.post("/cards/{card_id}/move")
def move_card(card_id: str, body: MoveCardBody, board_id: int = Depends(require_board_id)):
    db.move_card(card_id, body.columnId, body.position)
    return {"ok": True}
