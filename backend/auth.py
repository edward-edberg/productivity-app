import secrets
from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Response
from pydantic import BaseModel

import database as db

router = APIRouter(prefix="/api/auth")

SESSION_COOKIE = "session"
# In-memory session store: token -> user_id
_sessions: dict[str, int] = {}


class Credentials(BaseModel):
    username: str
    password: str


class RegisterBody(BaseModel):
    username: str
    password: str
    email: str = ""


class ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str


def get_current_user_id(session: str | None = Cookie(default=None, alias=SESSION_COOKIE)) -> int | None:
    if not session:
        return None
    return _sessions.get(session)


def require_user_id(session: str | None = Cookie(default=None, alias=SESSION_COOKIE)) -> int:
    user_id = get_current_user_id(session)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


@router.post("/register")
def register(body: RegisterBody):
    if len(body.username) < 2:
        raise HTTPException(status_code=422, detail="Username must be at least 2 characters")
    if len(body.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters")
    existing = db.get_user_by_username(body.username)
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken")
    db.register_user(body.username, body.password, body.email)
    return {"ok": True}


@router.post("/login")
def login(credentials: Credentials, response: Response):
    user_id = db.authenticate_user(credentials.username, credentials.password)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = secrets.token_urlsafe(32)
    _sessions[token] = user_id
    response.set_cookie(key=SESSION_COOKIE, value=token, httponly=True, samesite="lax")
    return {"ok": True}


@router.post("/logout")
def logout(response: Response, session: str | None = Cookie(default=None, alias=SESSION_COOKIE)):
    if session and session in _sessions:
        del _sessions[session]
    response.delete_cookie(key=SESSION_COOKIE)
    return {"ok": True}


@router.get("/me")
def me(user_id: int = __import__("fastapi").Depends(require_user_id)):
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"id": user["id"], "username": user["username"], "email": user["email"]}


@router.put("/me/password")
def change_password(body: ChangePasswordBody, user_id: int = __import__("fastapi").Depends(require_user_id)):
    user = db.get_user_by_username(db.get_user_by_id(user_id)["username"])
    if not db.verify_password(body.current_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters")
    db.update_user_password(user_id, body.new_password)
    return {"ok": True}


@router.put("/me/email")
def change_email(body: dict, user_id: int = __import__("fastapi").Depends(require_user_id)):
    email = body.get("email", "")
    db.update_user_email(user_id, email)
    return {"ok": True}
