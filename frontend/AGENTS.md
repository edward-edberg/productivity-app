# Frontend

## Overview

A working Kanban board MVP built with Next.js 16 + React 19. Currently a pure frontend demo with no backend, no authentication, and no persistence. All state is in-memory and resets on page reload.

## Tech Stack

- Next.js 16, React 19
- Tailwind CSS v4 (CSS-first config, no tailwind.config.js)
- @dnd-kit/core + @dnd-kit/sortable for drag and drop
- Space Grotesk (display/headings) and Manrope (body) from Google Fonts
- Vitest + @testing-library/react for unit tests
- Playwright for e2e tests

## Data Model (`src/lib/kanban.ts`)

```ts
type Card = { id: string; title: string; details: string }
type Column = { id: string; title: string; cardIds: string[] }
type BoardData = { columns: Column[]; cards: Record<string, Card> }
```

Cards are stored in a flat map keyed by id. Columns hold ordered arrays of card ids. This is the shape the backend API and AI structured output should mirror.

`moveCard(columns, activeId, overId)` — pure function, returns new columns array. Handles same-column reorder and cross-column move.

`createId(prefix)` — generates a unique id like `card-abc123def`.

`initialData` — hardcoded seed data for the demo (5 columns, 8 cards).

## Components

- `KanbanBoard` — root client component. Owns all board state, wires up DndContext, renders header + column grid.
- `KanbanColumn` — a single column. Uses `useDroppable` for the column drop zone and `SortableContext` for card ordering. Renders column title as a live `<input>` for inline rename.
- `KanbanCard` — a single draggable card. Uses `useSortable`. Shows title, details, and a Remove button.
- `KanbanCardPreview` — static clone rendered inside `DragOverlay` while dragging.
- `NewCardForm` — collapsed "Add a card" button that expands to a title + details form.

## Entry Point

`src/app/page.tsx` renders `<KanbanBoard />` directly. No routing yet.

`src/app/layout.tsx` registers fonts and metadata. Body background matches `--surface` (#f7f8fb).

`src/app/globals.css` defines CSS custom properties for the color scheme (see AGENTS.md at project root).

## Tests

Unit tests run with Vitest (`npm run test:unit`):
- `src/lib/kanban.test.ts` — covers `moveCard`: same-column reorder, cross-column move, drop onto empty column
- `src/components/KanbanBoard.test.tsx` — renders 5 columns, inline rename, add card, remove card

E2e tests run with Playwright (`npm run test:e2e`). Config is in `playwright.config.ts`.

## What Is Not Yet Implemented

- Authentication / login screen
- API calls to backend
- AI chat sidebar
- Persistence (board resets on reload)
- Card editing (only add and delete)
- Static export config for Docker serving
