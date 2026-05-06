"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import { moveCard, type BoardData } from "@/lib/kanban";
import { logout } from "@/lib/auth";
import {
  fetchBoard,
  apiRenameColumn,
  apiCreateCard,
  apiDeleteCard,
  apiMoveCard,
} from "@/lib/api";
import { AISidebar } from "@/components/AISidebar";

type KanbanBoardProps = {
  onLogout: () => void;
};

export const KanbanBoard = ({ onLogout }: KanbanBoardProps) => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  useEffect(() => {
    fetchBoard().then(setBoard);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const cardsById = useMemo(() => board?.cards ?? {}, [board]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);
    if (!over || active.id === over.id || !board) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const nextColumns = moveCard(board.columns, activeId, overId);
    setBoard((prev) => prev && { ...prev, columns: nextColumns });

    const toColumn = nextColumns.find((c) => c.cardIds.includes(activeId));
    if (toColumn) {
      const position = toColumn.cardIds.indexOf(activeId);
      apiMoveCard(activeId, toColumn.id, position);
    }
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    setBoard((prev) =>
      prev && {
        ...prev,
        columns: prev.columns.map((c) => (c.id === columnId ? { ...c, title } : c)),
      }
    );
    apiRenameColumn(columnId, title);
  };

  const handleAddCard = async (columnId: string, title: string, details: string) => {
    const card = await apiCreateCard(columnId, title, details);
    setBoard((prev) =>
      prev && {
        ...prev,
        cards: { ...prev.cards, [card.id]: card },
        columns: prev.columns.map((c) =>
          c.id === columnId ? { ...c, cardIds: [...c.cardIds, card.id] } : c
        ),
      }
    );
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    setBoard((prev) => {
      if (!prev) return prev;
      const cards = Object.fromEntries(Object.entries(prev.cards).filter(([id]) => id !== cardId));
      const columns = prev.columns.map((c) =>
        c.id === columnId ? { ...c, cardIds: c.cardIds.filter((id) => id !== cardId) } : c
      );
      return { ...prev, cards, columns };
    });
    apiDeleteCard(cardId);
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  if (!board) return null;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <div className="relative px-6 pb-16 pt-12">
        <main className="flex flex-col gap-10">
          <header className="flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
                  Single Board Kanban
                </p>
                <h1 className="mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]">
                  Kanban Studio
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--gray-text)]">
                  Keep momentum visible. Rename columns, drag cards between stages,
                  and capture quick notes without getting buried in settings.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--gray-text)]">
                    Focus
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--primary-blue)]">
                    One board. Five columns. Zero clutter.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => { await logout(); onLogout(); }}
                  className="mt-1 rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)] transition hover:border-[var(--navy-dark)] hover:text-[var(--navy-dark)]"
                >
                  Sign out
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {board.columns.map((column) => (
                <div
                  key={column.id}
                  className="flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)]"
                >
                  <span className="h-2 w-2 rounded-full bg-[var(--accent-yellow)]" />
                  {column.title}
                </div>
              ))}
            </div>
          </header>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <section className="grid gap-6 lg:grid-cols-5">
              {board.columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={column.cardIds.map((id) => board.cards[id]).filter(Boolean)}
                  onRename={handleRenameColumn}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCard}
                />
              ))}
            </section>
            <DragOverlay>
              {activeCard ? (
                <div className="w-[260px]">
                  <KanbanCardPreview card={activeCard} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </main>

      </div>

      <AISidebar onBoardUpdate={setBoard} />
    </div>
  );
};
