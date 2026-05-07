import hashlib
import hmac
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

IMPORTANCE_VALUES = ("low", "medium", "high")


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL DEFAULT '',
                email TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS boards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                name TEXT NOT NULL DEFAULT 'My Board',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
                position INTEGER NOT NULL,
                importance TEXT NOT NULL DEFAULT 'medium',
                due_date TEXT
            )
        """)
        _migrate(conn)
    _seed_default_user()


def _migrate(conn):
    cols = {row[1] for row in conn.execute("PRAGMA table_info(cards)")}
    if "importance" not in cols:
        conn.execute("ALTER TABLE cards ADD COLUMN importance TEXT NOT NULL DEFAULT 'medium'")
    if "due_date" not in cols:
        conn.execute("ALTER TABLE cards ADD COLUMN due_date TEXT")

    user_cols = {row[1] for row in conn.execute("PRAGMA table_info(users)")}
    if "password_hash" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''")
    if "email" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''")
    if "created_at" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'))")

    board_cols = {row[1] for row in conn.execute("PRAGMA table_info(boards)")}
    if "name" not in board_cols:
        conn.execute("ALTER TABLE boards ADD COLUMN name TEXT NOT NULL DEFAULT 'My Board'")
    if "created_at" not in board_cols:
        conn.execute("ALTER TABLE boards ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'))")


def _seed_default_user():
    """Ensure a default 'user' account exists for initial setup."""
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM users WHERE username = 'user'").fetchone()
        if not row:
            cursor = conn.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                ("user", hash_password("password")),
            )
            user_id = cursor.lastrowid
            _create_board_with_conn(conn, user_id, "My Board")


def _create_board_with_conn(conn, user_id: int, name: str) -> int:
    cursor = conn.execute(
        "INSERT INTO boards (user_id, name) VALUES (?, ?)", (user_id, name)
    )
    board_id = cursor.lastrowid
    for position, (col_id_base, title) in enumerate(DEFAULT_COLUMNS):
        col_id = f"{col_id_base}-{board_id}"
        conn.execute(
            "INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)",
            (col_id, board_id, title, position),
        )
    return board_id


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


def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000)
    return f"{salt}:{key.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    if not stored_hash or ":" not in stored_hash:
        return False
    salt, key_hex = stored_hash.split(":", 1)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000)
    return hmac.compare_digest(key.hex(), key_hex)


# ─── User management ───────────────────────────────────────────────────────────

def register_user(username: str, password: str, email: str = "") -> int:
    with get_conn() as conn:
        cursor = conn.execute(
            "INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)",
            (username, hash_password(password), email),
        )
        return cursor.lastrowid


def authenticate_user(username: str, password: str) -> int | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, password_hash FROM users WHERE username = ?", (username,)
        ).fetchone()
        if not row:
            return None
        if not verify_password(password, row["password_hash"]):
            return None
        return row["id"]


def get_user_by_id(user_id: int) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, username, email, created_at FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        if not row:
            return None
        return dict(row)


def get_user_by_username(username: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, username, email, password_hash, created_at FROM users WHERE username = ?",
            (username,),
        ).fetchone()
        if not row:
            return None
        return dict(row)


def list_users() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, username, email, created_at FROM users ORDER BY id"
        ).fetchall()
        return [dict(r) for r in rows]


def update_user_password(user_id: int, new_password: str):
    with get_conn() as conn:
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(new_password), user_id),
        )


def update_user_email(user_id: int, email: str):
    with get_conn() as conn:
        conn.execute("UPDATE users SET email = ? WHERE id = ?", (email, user_id))


def delete_user(user_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))


# Legacy helper (keeps conftest clean)
def get_or_create_user(username: str) -> int:
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if row:
            return row["id"]
        cursor = conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, hash_password("password")),
        )
        return cursor.lastrowid


# ─── Board management ──────────────────────────────────────────────────────────

def create_board(user_id: int, name: str = "My Board") -> int:
    with get_conn() as conn:
        return _create_board_with_conn(conn, user_id, name)


def get_or_create_board(user_id: int) -> int:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM boards WHERE user_id = ? ORDER BY id LIMIT 1", (user_id,)
        ).fetchone()
        if row:
            return row["id"]
    return create_board(user_id)


def list_boards(user_id: int) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, name, created_at FROM boards WHERE user_id = ? ORDER BY id",
            (user_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def rename_board(board_id: int, name: str):
    with get_conn() as conn:
        conn.execute("UPDATE boards SET name = ? WHERE id = ?", (name, board_id))


def delete_board(board_id: int):
    with get_conn() as conn:
        col_ids = [
            r["id"]
            for r in conn.execute("SELECT id FROM columns WHERE board_id = ?", (board_id,)).fetchall()
        ]
        for col_id in col_ids:
            conn.execute("DELETE FROM cards WHERE column_id = ?", (col_id,))
        conn.execute("DELETE FROM columns WHERE board_id = ?", (board_id,))
        conn.execute("DELETE FROM boards WHERE id = ?", (board_id,))


def board_belongs_to_user(board_id: int, user_id: int) -> bool:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT 1 FROM boards WHERE id = ? AND user_id = ?", (board_id, user_id)
        ).fetchone()
        return row is not None


# ─── Board data ────────────────────────────────────────────────────────────────

def get_board_data(board_id: int) -> dict:
    with get_conn() as conn:
        board_row = conn.execute("SELECT id, name FROM boards WHERE id = ?", (board_id,)).fetchone()
        cols = conn.execute(
            "SELECT id, title FROM columns WHERE board_id = ? ORDER BY position",
            (board_id,),
        ).fetchall()
        result_columns = []
        result_cards = {}
        for col in cols:
            cards = conn.execute(
                "SELECT id, title, details, importance, due_date FROM cards WHERE column_id = ? ORDER BY position",
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
                    "importance": card["importance"],
                    "dueDate": card["due_date"],
                }
        board_name = board_row["name"] if board_row else "My Board"
        return {"id": board_id, "name": board_name, "columns": result_columns, "cards": result_cards}


def rename_column(column_id: str, title: str):
    with get_conn() as conn:
        conn.execute("UPDATE columns SET title = ? WHERE id = ?", (title, column_id))


def create_card(column_id: str, title: str, details: str, importance: str = "medium", due_date: str | None = None) -> dict:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COALESCE(MAX(position), -1) AS max_pos FROM cards WHERE column_id = ?",
            (column_id,),
        ).fetchone()
        position = row["max_pos"] + 1
        card_id = generate_id("card")
        importance = importance if importance in IMPORTANCE_VALUES else "medium"
        conn.execute(
            "INSERT INTO cards (id, column_id, title, details, position, importance, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (card_id, column_id, title, details, position, importance, due_date),
        )
        return {"id": card_id, "title": title, "details": details, "importance": importance, "dueDate": due_date}


def update_card(card_id: str, title: str, details: str, importance: str = "medium", due_date: str | None = None):
    importance = importance if importance in IMPORTANCE_VALUES else "medium"
    with get_conn() as conn:
        conn.execute(
            "UPDATE cards SET title = ?, details = ?, importance = ?, due_date = ? WHERE id = ?",
            (title, details, importance, due_date, card_id),
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
                importance = card.get("importance", "medium")
                importance = importance if importance in IMPORTANCE_VALUES else "medium"
                due_date = card.get("dueDate")
                if card_id in existing_card_ids:
                    conn.execute(
                        "UPDATE cards SET title = ?, details = ?, column_id = ?, position = ?, importance = ?, due_date = ? WHERE id = ?",
                        (card["title"], card.get("details", ""), col["id"], card_pos, importance, due_date, card_id),
                    )
                else:
                    conn.execute(
                        "INSERT INTO cards (id, column_id, title, details, position, importance, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (card_id, col["id"], card["title"], card.get("details", ""), card_pos, importance, due_date),
                    )
