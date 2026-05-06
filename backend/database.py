import os
import random
import string
import time
from contextlib import contextmanager
from pathlib import Path
import sqlite3

DB_PATH = Path(os.getenv("DB_PATH", "data/pm.db"))

DEFAULT_COLUMNS = [
    ("col-backlog", "Backlog"),
    ("col-discovery", "Discovery"),
    ("col-progress", "In Progress"),
    ("col-review", "Review"),
    ("col-done", "Done"),
]


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS boards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE REFERENCES users(id)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS columns (
                id TEXT PRIMARY KEY,
                board_id INTEGER NOT NULL REFERENCES boards(id),
                title TEXT NOT NULL,
                position INTEGER NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cards (
                id TEXT PRIMARY KEY,
                column_id TEXT NOT NULL REFERENCES columns(id),
                title TEXT NOT NULL,
                details TEXT NOT NULL DEFAULT '',
                position INTEGER NOT NULL
            )
        """)


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def generate_id(prefix: str) -> str:
    random_part = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    time_part = format(int(time.time() * 1000), "x")
    return f"{prefix}-{random_part}{time_part}"


def get_or_create_user(username: str) -> int:
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if row:
            return row["id"]
        cursor = conn.execute("INSERT INTO users (username) VALUES (?)", (username,))
        return cursor.lastrowid


def get_or_create_board(user_id: int) -> int:
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM boards WHERE user_id = ?", (user_id,)).fetchone()
        if row:
            return row["id"]
        cursor = conn.execute("INSERT INTO boards (user_id) VALUES (?)", (user_id,))
        board_id = cursor.lastrowid
        for position, (col_id, title) in enumerate(DEFAULT_COLUMNS):
            conn.execute(
                "INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)",
                (col_id, board_id, title, position),
            )
        return board_id


def get_board_data(board_id: int) -> dict:
    with get_conn() as conn:
        cols = conn.execute(
            "SELECT id, title FROM columns WHERE board_id = ? ORDER BY position",
            (board_id,),
        ).fetchall()
        result_columns = []
        result_cards = {}
        for col in cols:
            cards = conn.execute(
                "SELECT id, title, details FROM cards WHERE column_id = ? ORDER BY position",
                (col["id"],),
            ).fetchall()
            result_columns.append({
                "id": col["id"],
                "title": col["title"],
                "cardIds": [c["id"] for c in cards],
            })
            for card in cards:
                result_cards[card["id"]] = {
                    "id": card["id"],
                    "title": card["title"],
                    "details": card["details"],
                }
        return {"columns": result_columns, "cards": result_cards}


def rename_column(column_id: str, title: str):
    with get_conn() as conn:
        conn.execute("UPDATE columns SET title = ? WHERE id = ?", (title, column_id))


def create_card(column_id: str, title: str, details: str) -> dict:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COALESCE(MAX(position), -1) AS max_pos FROM cards WHERE column_id = ?",
            (column_id,),
        ).fetchone()
        position = row["max_pos"] + 1
        card_id = generate_id("card")
        conn.execute(
            "INSERT INTO cards (id, column_id, title, details, position) VALUES (?, ?, ?, ?, ?)",
            (card_id, column_id, title, details, position),
        )
        return {"id": card_id, "title": title, "details": details}


def update_card(card_id: str, title: str, details: str):
    with get_conn() as conn:
        conn.execute(
            "UPDATE cards SET title = ?, details = ? WHERE id = ?",
            (title, details, card_id),
        )


def delete_card(card_id: str):
    with get_conn() as conn:
        card = conn.execute(
            "SELECT column_id, position FROM cards WHERE id = ?", (card_id,)
        ).fetchone()
        if not card:
            return
        conn.execute(
            "UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?",
            (card["column_id"], card["position"]),
        )
        conn.execute("DELETE FROM cards WHERE id = ?", (card_id,))


def move_card(card_id: str, to_column_id: str, to_position: int):
    with get_conn() as conn:
        card = conn.execute(
            "SELECT column_id, position FROM cards WHERE id = ?", (card_id,)
        ).fetchone()
        if not card:
            return
        from_column_id = card["column_id"]
        from_position = card["position"]

        if from_column_id == to_column_id:
            if from_position == to_position:
                return
            if from_position < to_position:
                conn.execute(
                    "UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ? AND position <= ?",
                    (from_column_id, from_position, to_position),
                )
            else:
                conn.execute(
                    "UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ? AND position < ?",
                    (from_column_id, to_position, from_position),
                )
            conn.execute("UPDATE cards SET position = ? WHERE id = ?", (to_position, card_id))
        else:
            conn.execute(
                "UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?",
                (from_column_id, from_position),
            )
            conn.execute(
                "UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?",
                (to_column_id, to_position),
            )
            conn.execute(
                "UPDATE cards SET column_id = ?, position = ? WHERE id = ?",
                (to_column_id, to_position, card_id),
            )


def apply_board_update(board_id: int, board_update: dict):
    with get_conn() as conn:
        existing_card_ids = {
            row["id"]
            for row in conn.execute(
                "SELECT c.id FROM cards c JOIN columns col ON c.column_id = col.id WHERE col.board_id = ?",
                (board_id,),
            ).fetchall()
        }
        new_card_ids = set(board_update.get("cards", {}).keys())

        for card_id in existing_card_ids - new_card_ids:
            conn.execute("DELETE FROM cards WHERE id = ?", (card_id,))

        for col_pos, col in enumerate(board_update.get("columns", [])):
            conn.execute(
                "UPDATE columns SET title = ?, position = ? WHERE id = ?",
                (col["title"], col_pos, col["id"]),
            )
            for card_pos, card_id in enumerate(col.get("cardIds", [])):
                card = board_update["cards"].get(card_id)
                if not card:
                    continue
                if card_id in existing_card_ids:
                    conn.execute(
                        "UPDATE cards SET title = ?, details = ?, column_id = ?, position = ? WHERE id = ?",
                        (card["title"], card.get("details", ""), col["id"], card_pos, card_id),
                    )
                else:
                    conn.execute(
                        "INSERT INTO cards (id, column_id, title, details, position) VALUES (?, ?, ?, ?, ?)",
                        (card_id, col["id"], card["title"], card.get("details", ""), card_pos),
                    )
