from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse

import database
from ai import router as ai_router
from auth import router as auth_router
from board import router as board_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(auth_router)
app.include_router(board_router)
app.include_router(ai_router)

STATIC_DIR = Path(__file__).parent / "static"


@app.get("/api/hello")
def hello():
    return {"message": "hello"}


if STATIC_DIR.exists():
    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        candidate = STATIC_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
else:
    @app.get("/")
    def root():
        from fastapi.responses import HTMLResponse
        return HTMLResponse("<html><body><h1>Hello World</h1></body></html>")
