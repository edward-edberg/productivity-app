from fastapi import APIRouter, Cookie, HTTPException, Response
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth")

SESSION_TOKEN = "session"
VALID_TOKEN = "authenticated"


class Credentials(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(credentials: Credentials, response: Response):
    if credentials.username != "user" or credentials.password != "password":
        raise HTTPException(status_code=401, detail="Invalid credentials")
    response.set_cookie(key=SESSION_TOKEN, value=VALID_TOKEN, httponly=True, samesite="lax")
    return {"ok": True}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=SESSION_TOKEN)
    return {"ok": True}


@router.get("/me")
def me(session: str | None = Cookie(default=None)):
    if session != VALID_TOKEN:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"username": "user"}
