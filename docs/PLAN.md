# Project Plan

## Part 1: Plan
- [x] Review existing frontend code and document it in `frontend/AGENTS.md`
- [x] Enrich this plan with detailed substeps and success criteria
- [x] User reviews and approves this plan

**Success criteria:** User has signed off on the plan before any implementation begins.

---

## Part 2: Scaffolding

Set up Docker infrastructure, FastAPI backend, and start/stop scripts. Goal: a "hello world" proving the containerized stack works end-to-end.

- [x] Create `backend/pyproject.toml` with uv, FastAPI, and uvicorn dependencies
- [x] Create `backend/main.py` with:
  - `GET /` returning a plain "Hello World" HTML response
  - `GET /api/hello` returning `{"message": "hello"}` JSON
- [x] Create `Dockerfile` at project root:
  - Install uv and Python deps
  - Expose a port (8000)
  - Start uvicorn
- [x] Create `scripts/start.sh`, `scripts/start.bat`, `scripts/start.ps1`
- [x] Create `scripts/stop.sh`, `scripts/stop.bat`, `scripts/stop.ps1`
- [x] Build and run the container

**Success criteria:**
- `curl http://localhost:8000/` returns Hello World HTML
- `curl http://localhost:8000/api/hello` returns `{"message": "hello"}`
- Start and stop scripts work on Mac

---

## Part 3: Add in Frontend

Statically build the Next.js app and serve it from FastAPI.

- [x] Add `output: 'export'` to `frontend/next.config.ts`
- [x] Confirm `npm run build` in `frontend/` produces an `out/` directory
- [x] Update `backend/main.py` to serve `frontend/out/` as static files at `/`, with a catch-all for client-side routing
- [x] Update `Dockerfile` to install Node, build the frontend, copy `out/` into the image, then start uvicorn
- [x] Rebuild and run the container
- [x] Run unit tests: `npm run test:unit` in `frontend/`
- [x] Run e2e tests: configure Playwright base URL to `http://localhost:8000` and run `npm run test:e2e`

**Success criteria:**
- Kanban board renders at `http://localhost:8000/`
- All existing Vitest unit tests pass
- Playwright e2e tests pass against the running container

---

## Part 4: Add in a Fake User Sign-in Experience

Add login/logout so the board is behind a credential check.

- [x] Add `POST /api/auth/login` to FastAPI: accepts `{username, password}`, checks hardcoded values (`user` / `password`), returns a signed session token (cookie or JSON)
- [x] Add `POST /api/auth/logout` to FastAPI: clears the session
- [x] Add `GET /api/auth/me` to FastAPI: returns current user or 401
- [x] Add a login page component to the Next.js frontend
- [x] On app load, check auth status via `/api/auth/me`; redirect to login if unauthenticated
- [x] On successful login, redirect to the board
- [x] Show a logout button in the header; clicking it calls `/api/auth/logout` and redirects to login
- [x] Rebuild the static export and container
- [x] Write backend unit tests for the auth endpoints
- [x] Write frontend unit tests for the login component and auth redirect logic
- [x] Run e2e tests covering login, board access, and logout

**Success criteria:**
- Unauthenticated visit to `/` redirects to `/login`
- Logging in with correct credentials shows the board
- Logging in with wrong credentials shows an error
- Logout returns to the login screen
- All tests pass

---

## Part 5: Database Modeling

Design and document the SQLite schema before writing any database code.

- [ ] Draft a schema covering: users, boards, columns, cards (with ordering)
- [ ] Save schema as `docs/schema.md`, including table definitions, column types, and any constraints or indexes
- [ ] User reviews and approves the schema

**Success criteria:** User has signed off on `docs/schema.md` before any database code is written.

---

## Part 6: Backend API

Implement the database and CRUD API routes.

- [x] Add `sqlalchemy` (or raw `sqlite3`) and `alembic` (optional) to backend dependencies
- [x] On startup: create the SQLite database at a configurable path if it doesn't exist; run schema migrations
- [x] Implement API routes:
  - `GET /api/board` — fetch the current user's board (columns + cards in order)
  - `PUT /api/columns/{id}` — rename a column
  - `POST /api/cards` — create a card in a column
  - `PUT /api/cards/{id}` — update card title/details
  - `DELETE /api/cards/{id}` — delete a card
  - `POST /api/cards/{id}/move` — move a card to a column at a position
- [x] Seed the database with the default 5 columns for a new user's board
- [x] Write backend unit tests for every route (use a test SQLite database)

**Success criteria:**
- All routes return correct data and status codes
- All backend unit tests pass
- Database file is created automatically on first run

---

## Part 7: Frontend + Backend Integration

Replace all in-memory state with live API calls.

- [x] Remove `initialData` hardcoded seed; fetch board from `GET /api/board` on load
- [x] Persist column renames via `PUT /api/columns/{id}`
- [x] Persist card creation via `POST /api/cards`
- [x] Persist card deletion via `DELETE /api/cards/{id}`
- [x] Persist card moves via `POST /api/cards/{id}/move`
- [x] Show a loading state while the initial board fetch is in flight
- [x] Rebuild and run the full container
- [x] Write frontend unit tests for API-connected components (mock fetch)
- [x] Update e2e tests to verify persistence: add a card, reload, confirm it's still there

**Success criteria:**
- Board state survives a page reload
- All CRUD operations persist correctly
- All tests pass

---

## Part 8: AI Connectivity

Verify the Claude API is reachable from the backend.

- [x] Add `anthropic` SDK to backend dependencies
- [x] Add `POST /api/ai/test` endpoint: calls Claude with the prompt "What is 2+2? Reply with just the number." using `claude-opus-4-7`; reads `ANTHROPIC_API_KEY` from env
- [x] Load `.env` in the container (pass as Docker env or mount)
- [x] Call the endpoint and verify the response

**Success criteria:**
- `POST /api/ai/test` returns `{"result": "4"}` (or equivalent)
- No hardcoded API keys in source

---

## Part 9: AI Chat Backend

Wire the AI to the board state with structured output.

- [x] Define the structured output schema:
  ```json
  {
    "response": "string",
    "board_update": null | { same shape as BoardData }
  }
  ```
- [x] Add `POST /api/ai/chat` endpoint:
  - Accepts `{ messages: [{role, content}], board: BoardData }`
  - Builds a system prompt that includes the current board JSON
  - Calls Claude with the conversation history
  - Returns structured output matching the schema above
- [x] If `board_update` is non-null, apply it to the database and return the updated board
- [x] Write backend unit tests for the chat endpoint (mock the Anthropic SDK)

**Success criteria:**
- "Add a card called X to Backlog" results in `board_update` containing the new card
- "What cards are in review?" returns a natural language `response` with no `board_update`
- All backend tests pass

---

## Part 10: AI Chat Sidebar UI

Add the chat interface and connect it to the backend.

- [x] Add a collapsible sidebar panel to `KanbanBoard`
- [x] Sidebar contains: message history list, text input, send button
- [x] On send: call `POST /api/ai/chat` with current board state and message history
- [x] Show loading indicator while waiting for response
- [x] If `board_update` is present in the response, update board state and re-render the columns
- [x] Rebuild and run the full container
- [x] Write unit tests for the sidebar component
- [x] Write e2e test: type a chat message that creates a card, verify the card appears on the board

**Success criteria:**
- User can chat with the AI and see its response in the sidebar
- AI-driven board changes are reflected immediately without a page reload
- All tests pass
