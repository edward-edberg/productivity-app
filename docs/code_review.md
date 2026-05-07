# Code Review

Reviewed: 2026-05-06  
Scope: Full repo — backend, frontend, tests

---

## Bugs

### 1. Column rename fires an API call on every keystroke

**File:** `frontend/src/components/KanbanColumn.tsx:44`

```tsx
onChange={(event) => onRename(column.id, event.target.value)}
```

`onRename` calls `apiRenameColumn` immediately, which fires a `PUT /api/columns/{id}` on every character typed. This hammers the backend and can cause race conditions where a slow earlier request overwrites a faster later one. Fix: trigger the API call on `onBlur` instead, keeping the `onChange` for local state only.

---

### 2. Mutation API errors are silently swallowed

**File:** `frontend/src/lib/api.ts:9–36`

`apiRenameColumn`, `apiDeleteCard`, and `apiMoveCard` all fire-and-forget — they don't `await` or check the response. If the server returns an error (network failure, restart, etc.), the UI shows the optimistic update but the database was never updated. The user has no idea the operation failed. `apiCreateCard` does await but doesn't check `res.ok`. Fix: check `res.ok` and surface an error or revert state on failure.

---

### 3. Board fetch: blank screen during load with no feedback

**File:** `frontend/src/components/KanbanBoard.tsx:104`  
**File:** `frontend/src/app/page.tsx:15`

Both auth check (`authed === null`) and board load (`!board`) return `null` — a blank white screen. The PLAN.md called for a loading state during initial board fetch. Fix: render a minimal skeleton or spinner.

---

## Dead Code

### 4. `initialData` in `lib/kanban.ts` is unused

**File:** `frontend/src/lib/kanban.ts:18–72`

The large `initialData` export (8 hardcoded cards) is never imported anywhere since the board was wired to the API in Part 7. It's leftover from the original frontend-only prototype. Delete it.

---

### 5. `createId` in `lib/kanban.ts` is unused

**File:** `frontend/src/lib/kanban.ts:164–168`

```ts
export const createId = (prefix: string) => { ... }
```

Card IDs are now generated server-side. This function is exported but never imported. Delete it.

---

### 6. Scaffold `/api/hello` endpoint left in production code

**File:** `backend/main.py:27–29`

```python
@app.get("/api/hello")
def hello():
    return {"message": "hello"}
```

This was the Part 2 scaffolding sanity check. It should be removed.

---

## Missing Feature

### 7. Card edit endpoint exists in backend but is unreachable from the UI

**File:** `backend/board.py:55–57` — `PUT /api/cards/{id}` with `UpdateCardBody(title, details)`  
**File:** `frontend/src/lib/api.ts` — no `apiUpdateCard` function  
**File:** `frontend/src/components/KanbanCard.tsx` — no edit button or form

The backend endpoint and Pydantic model are fully implemented and tested, but there is no way to edit a card's title or details from the UI. Cards can only be deleted or moved. The AI can edit cards via chat, but there is no direct edit path. This is either a missing feature or intentional for MVP — worth deciding.

---

## Performance

### 8. Anthropic client instantiated on every AI request

**File:** `backend/ai.py:90, 108`

```python
client = anthropic.Anthropic(api_key=api_key)
```

A new SDK client is created on every call to `/api/ai/test` and `/api/ai/chat`. The API key is also re-read from the environment on every request. Move the client to module level, initialized once at import time (or via a FastAPI startup event).

---

### 9. N+1 queries in `get_board_data`

**File:** `backend/database.py:100–123`

Fetches all columns, then runs one `SELECT` per column to get its cards — 6 queries total for a 5-column board. A single JOIN would do this in one round-trip. For a single local user this has no practical impact, but it's worth noting if the schema ever grows.

---

## Test Gaps

### 10. E2E tests share a live database — not isolated

**File:** `frontend/tests/kanban.spec.ts`

All 7 Playwright tests clear cookies but run against the same server with the same persistent database. Cards created in one test (e.g., "Persistent card" in test 5, "AI created task" in test 6, "Drag me" in test 7) accumulate in Backlog. Tests become order-dependent: if test 6 ran before test 7, Backlog may have stale cards that affect assertions. The tests pass in the current order but are fragile if reordered or run individually.

Fix: add a `beforeEach` hook that calls a test-only reset endpoint, or clear/re-seed the DB via a script before the E2E suite runs.

---

### 11. `conftest.py` mutates module-level `DB_PATH` — breaks parallel test runs

**File:** `backend/conftest.py:9`

```python
database.DB_PATH = tmp_path / "test.db"
```

This directly patches the module global. Tests are currently sequential so it works, but adding `pytest-xdist` for parallel runs would cause tests to stomp each other's `DB_PATH`. Use dependency injection or a `monkeypatch` fixture instead.

---

## Minor

### 12. React key uses array index for chat messages

**File:** `frontend/src/components/AISidebar.tsx:84`

```tsx
{messages.map((msg, i) => (
  <div key={i} ...>
```

Index keys cause incorrect diffing if messages are ever removed from the list (not a current feature, but still a pattern to avoid). Use a stable ID — e.g., generate a UUID or use `role + timestamp` when appending each message.

---

### 13. Session cookie has no expiry

**File:** `backend/auth.py:19`

```python
response.set_cookie(key=SESSION_TOKEN, value=VALID_TOKEN, httponly=True, samesite="lax")
```

No `max_age` is set, so the cookie is a session cookie that expires when the browser tab/window closes. On some browsers this means it survives indefinitely across browser restarts. Add `max_age=86400` (or similar) for predictable behavior.

---

## Actions Summary

| # | Severity | Action |
|---|---|---|
| 1 | Bug | Change column rename to fire API on blur, not onChange |
| 2 | Bug | Add `res.ok` checks and user-visible errors to all mutation API calls |
| 3 | Bug | Replace `null` returns during load with a loading indicator |
| 4 | Cleanup | Delete `initialData` from `lib/kanban.ts` |
| 5 | Cleanup | Delete `createId` from `lib/kanban.ts` |
| 6 | Cleanup | Remove `/api/hello` from `backend/main.py` |
| 7 | Decision | Decide whether to build card edit UI or formally drop it for MVP |
| 8 | Performance | Move Anthropic client to module-level singleton |
| 9 | Performance | Optionally replace N+1 board query with a JOIN |
| 10 | Test | Isolate E2E tests from shared database state |
| 11 | Test | Replace `database.DB_PATH` mutation with `monkeypatch` in conftest |
| 12 | Minor | Use stable keys (not index) for chat message list |
| 13 | Minor | Add `max_age` to session cookie |
