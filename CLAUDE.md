# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An AI-assisted Kanban board app. The frontend (Next.js) exports as static files served by the backend (FastAPI). An embedded Claude integration reads the current board state and can update it via tool use.

## Commands

### Frontend (`frontend/`)

```bash
npm install
npm run dev          # Dev server at localhost:3000
npm run build        # Static export to out/
npm run lint         # ESLint
npm run test:unit    # Vitest unit tests
npm run test:e2e     # Playwright E2E (set BASE_URL env to override localhost:3000)
npm run test:all     # Both
```

Run a single unit test file:
```bash
npx vitest run src/lib/kanban.test.ts
```

### Backend (`backend/`)

```bash
uv sync              # Install dependencies
uvicorn main:app --reload --port 8000  # Dev server
pytest               # All tests
pytest test_ai.py -v # Single test file
```

### Docker (full stack)

```bash
bash scripts/start.sh   # Build and run container on port 8000
bash scripts/stop.sh    # Stop and remove container
```

## Architecture

### Request Flow

The app is deployed as a single Docker container. FastAPI (`backend/main.py`) serves the statically-exported Next.js app (`out/`) at the root, and all `/api/*` routes are handled by FastAPI routers. In development, the Next.js dev server proxies `/api/*` to `localhost:8000`.

### Auth

Cookie-based session auth. Credentials are hardcoded (`user` / `password`) in `backend/auth.py`. The frontend's root `page.tsx` calls `GET /api/auth/me` on mount; if it returns 401, it renders `<LoginPage>`, otherwise `<KanbanBoard>`.

### Board State

- **Frontend**: Managed with React `useState` in `KanbanBoard.tsx`. All mutations are optimistic — the UI updates immediately, then a PUT/POST/DELETE hits the API.
- **Data shape**: `BoardData = { columns: Column[], cards: Record<string, Card> }` — columns hold ordered `cardIds`, cards are a flat map keyed by id.
- **Move logic**: `moveCard()` in `lib/kanban.ts` handles both same-column reorder and cross-column moves. Column/card IDs use string prefixes (e.g., `col-backlog`, `card-abc123`).

### Database

Raw SQLite (no ORM) in `backend/database.py`. Connection management uses a `@contextmanager get_conn()` that auto-commits or rolls back. The db file lives at `data/pm.db` and is auto-initialized on startup with default columns: Backlog, Discovery, In Progress, Review, Done. All IDs stored as text.

### AI Integration

`backend/ai.py` exposes `POST /api/ai/chat`. Each request:
1. Fetches the current board state from the DB
2. Injects it as JSON into the system prompt
3. Calls `claude-opus-4-7` with a `update_board` tool definition
4. If Claude invokes the tool, the structured board update is written back to the DB
5. Returns `{ response, board_update?, board }` — the frontend replaces its board state with the returned `board`

`frontend/src/lib/chat.ts` wraps the single chat API call. `AISidebar.tsx` owns the chat history in local state.

### Drag and Drop

Uses `dnd-kit`. `KanbanBoard.tsx` owns `DndContext` with `closestCorners` collision detection. `KanbanColumn.tsx` uses `SortableContext`. The drag overlay renders `KanbanCardPreview.tsx`. On `onDragEnd`, `moveCard()` computes new state and `POST /api/cards/{id}/move` persists it.

### Build Strategy

`next.config.ts` sets `output: 'export'`. The Dockerfile runs `npm run build` in the Node stage, copies `out/` to `backend/static/`, then runs uvicorn. FastAPI mounts the static directory and adds a catch-all to serve `index.html` for client-side routing.

## Key Files

| File | Purpose |
|---|---|
| `backend/main.py` | FastAPI app, router registration, static file mount |
| `backend/database.py` | All SQL — schema init, queries, mutations |
| `backend/ai.py` | Claude API call, tool use, board update logic |
| `frontend/src/app/page.tsx` | Auth gate and top-level routing |
| `frontend/src/components/KanbanBoard.tsx` | Board state, drag-and-drop orchestration |
| `frontend/src/lib/kanban.ts` | `BoardData` types and `moveCard()` logic |
| `frontend/src/lib/api.ts` | Fetch wrapper for all backend calls |

## Environment

Requires `ANTHROPIC_API_KEY` in `.env` at the repo root for AI features.
