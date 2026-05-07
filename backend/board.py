from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

import database as db
from auth import require_user_id

router = APIRouter(prefix="/api")


def require_board_id(
    board_id: int | None = Query(default=None, alias="boardId"),
    user_id: int = Depends(require_user_id),
) -> int:
    if board_id is not None:
        if not db.board_belongs_to_user(board_id, user_id):
            raise HTTPException(status_code=403, detail="Board not found")
        return board_id
    return db.get_or_create_board(user_id)


class RenameBoardBody(BaseModel):
    name: str


class RenameColumnBody(BaseModel):
    title: str


class CreateColumnBody(BaseModel):
    title: str


class CreateCardBody(BaseModel):
    columnId: str
    title: str
    details: str = ""
    importance: str = "medium"
    dueDate: str | None = None
    labelIds: list[str] = []
    storyPoints: int | None = None


class UpdateCardBody(BaseModel):
    title: str
    details: str
    importance: str = "medium"
    dueDate: str | None = None
    labelIds: list[str] | None = None
    storyPoints: int | None = None


class SetWipLimitBody(BaseModel):
    wipLimit: int | None = None


class CreateChecklistItemBody(BaseModel):
    text: str


class UpdateChecklistItemBody(BaseModel):
    text: str
    checked: bool


class MoveCardBody(BaseModel):
    columnId: str
    position: int


class CreateLabelBody(BaseModel):
    name: str
    color: str = "#6b7280"


class UpdateLabelBody(BaseModel):
    name: str
    color: str


class SetCardLabelsBody(BaseModel):
    labelIds: list[str]


# ─── Board management ──────────────────────────────────────────────────────────

@router.get("/boards")
def list_boards(user_id: int = Depends(require_user_id)):
    return db.list_boards(user_id)


@router.post("/boards")
def create_board(body: RenameBoardBody, user_id: int = Depends(require_user_id)):
    board_id = db.create_board(user_id, body.name)
    return {"id": board_id, "name": body.name}


@router.put("/boards/{bid}")
def rename_board(bid: int, body: RenameBoardBody, user_id: int = Depends(require_user_id)):
    if not db.board_belongs_to_user(bid, user_id):
        raise HTTPException(status_code=403, detail="Board not found")
    db.rename_board(bid, body.name)
    return {"ok": True}


@router.delete("/boards/{bid}")
def delete_board(bid: int, user_id: int = Depends(require_user_id)):
    if not db.board_belongs_to_user(bid, user_id):
        raise HTTPException(status_code=403, detail="Board not found")
    boards = db.list_boards(user_id)
    if len(boards) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete your only board")
    db.delete_board(bid)
    return {"ok": True}


# ─── Board data ────────────────────────────────────────────────────────────────

@router.get("/board")
def get_board(board_id: int = Depends(require_board_id)):
    return db.get_board_data(board_id)


# ─── Column management ─────────────────────────────────────────────────────────

@router.post("/columns")
def create_column(body: CreateColumnBody, board_id: int = Depends(require_board_id)):
    col = db.create_column(board_id, body.title)
    return col


@router.put("/columns/{column_id}")
def rename_column(column_id: str, body: RenameColumnBody, board_id: int = Depends(require_board_id)):
    db.rename_column(column_id, body.title)
    return {"ok": True}


@router.put("/columns/{column_id}/wip-limit")
def set_wip_limit(column_id: str, body: SetWipLimitBody, board_id: int = Depends(require_board_id)):
    db.set_column_wip_limit(column_id, body.wipLimit)
    return {"ok": True}


@router.delete("/columns/{column_id}")
def delete_column(column_id: str, board_id: int = Depends(require_board_id)):
    board = db.get_board_data(board_id)
    if len(board["columns"]) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last column")
    db.delete_column(column_id)
    return {"ok": True}


# ─── Label management ──────────────────────────────────────────────────────────

@router.get("/labels")
def list_labels(board_id: int = Depends(require_board_id)):
    return db.list_labels(board_id)


@router.post("/labels")
def create_label(body: CreateLabelBody, board_id: int = Depends(require_board_id)):
    label = db.create_label(board_id, body.name, body.color)
    return label


@router.put("/labels/{label_id}")
def update_label(label_id: str, body: UpdateLabelBody, board_id: int = Depends(require_board_id)):
    db.update_label(label_id, body.name, body.color)
    return {"ok": True}


@router.delete("/labels/{label_id}")
def delete_label(label_id: str, board_id: int = Depends(require_board_id)):
    db.delete_label(label_id)
    return {"ok": True}


@router.put("/cards/{card_id}/labels")
def set_card_labels(card_id: str, body: SetCardLabelsBody, board_id: int = Depends(require_board_id)):
    db.set_card_labels(card_id, body.labelIds)
    return {"ok": True}


# ─── Card CRUD ─────────────────────────────────────────────────────────────────

@router.post("/cards")
def create_card(body: CreateCardBody, board_id: int = Depends(require_board_id)):
    card = db.create_card(
        body.columnId, body.title, body.details,
        body.importance, body.dueDate, body.labelIds, body.storyPoints,
    )
    return card


@router.put("/cards/{card_id}")
def update_card(card_id: str, body: UpdateCardBody, board_id: int = Depends(require_board_id)):
    db.update_card(
        card_id, body.title, body.details,
        body.importance, body.dueDate, body.labelIds, body.storyPoints,
    )
    return {"ok": True}


# ─── Checklist endpoints ───────────────────────────────────────────────────────

@router.get("/cards/{card_id}/checklist")
def list_checklist(card_id: str, board_id: int = Depends(require_board_id)):
    return db.list_checklist_items(card_id)


@router.post("/cards/{card_id}/checklist")
def add_checklist_item(card_id: str, body: CreateChecklistItemBody, board_id: int = Depends(require_board_id)):
    return db.create_checklist_item(card_id, body.text)


@router.put("/cards/{card_id}/checklist/{item_id}")
def update_checklist_item(card_id: str, item_id: str, body: UpdateChecklistItemBody, board_id: int = Depends(require_board_id)):
    db.update_checklist_item(item_id, body.text, body.checked)
    return {"ok": True}


@router.delete("/cards/{card_id}/checklist/{item_id}")
def delete_checklist_item(card_id: str, item_id: str, board_id: int = Depends(require_board_id)):
    db.delete_checklist_item(item_id)
    return {"ok": True}


@router.delete("/cards/{card_id}")
def delete_card(card_id: str, board_id: int = Depends(require_board_id)):
    db.delete_card(card_id)
    return {"ok": True}


@router.post("/cards/{card_id}/move")
def move_card(card_id: str, body: MoveCardBody, board_id: int = Depends(require_board_id)):
    db.move_card(card_id, body.columnId, body.position)
    return {"ok": True}
