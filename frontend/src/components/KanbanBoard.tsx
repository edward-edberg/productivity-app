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
import { BoardSelector } from "@/components/BoardSelector";
import { UserMenu } from "@/components/UserMenu";
import { FilterBar, emptyFilter, type FilterState } from "@/components/FilterBar";
import { BoardStats } from "@/components/BoardStats";
import { moveCard, type BoardData, type BoardSummary, type Card, type Importance, type Label } from "@/lib/kanban";
import {
  fetchBoard,
  fetchBoards,
  apiRenameColumn,
  apiCreateColumn,
  apiDeleteColumn,
  apiCreateCard,
  apiDeleteCard,
  apiMoveCard,
  apiUpdateCard,
} from "@/lib/api";
import { AISidebar } from "@/components/AISidebar";
import type { User } from "@/lib/auth";

type KanbanBoardProps = {
  user: User;
  onLogout: () => void;
};

export const KanbanBoard = ({ user, onLogout }: KanbanBoardProps) => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<number | undefined>(undefined);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>(emptyFilter);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  useEffect(() => {
    fetchBoards().then((bs) => {
      setBoards(bs);
      if (bs.length > 0 && activeBoardId === undefined) {
        setActiveBoardId(bs[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (activeBoardId !== undefined) {
      fetchBoard(activeBoardId).then((b) => {
        setBoard(b);
        setFilter(emptyFilter);
      });
    }
  }, [activeBoardId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const cardsById = useMemo(() => board?.cards ?? {}, [board]);

  const filteredCardIds = useMemo(() => {
    if (!board) return new Set<string>();
    const { search, importance, labelIds } = filter;
    if (!search && !importance && labelIds.length === 0) return null;
    return new Set(
      Object.values(board.cards)
        .filter((card) => {
          if (importance && card.importance !== importance) return false;
          if (labelIds.length > 0 && !labelIds.some((id) => (card.labelIds ?? []).includes(id))) return false;
          if (search) {
            const q = search.toLowerCase();
            if (!card.title.toLowerCase().includes(q) && !card.details.toLowerCase().includes(q)) return false;
          }
          return true;
        })
        .map((c) => c.id)
    );
  }, [board, filter]);

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
      apiMoveCard(activeId, toColumn.id, position, activeBoardId);
    }
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    setBoard((prev) =>
      prev && { ...prev, columns: prev.columns.map((c) => (c.id === columnId ? { ...c, title } : c)) }
    );
    apiRenameColumn(columnId, title, activeBoardId);
  };

  const handleDeleteColumn = async (columnId: string) => {
    await apiDeleteColumn(columnId, activeBoardId);
    setBoard((prev) => {
      if (!prev) return prev;
      const col = prev.columns.find((c) => c.id === columnId);
      if (!col) return prev;
      const removedCardIds = new Set(col.cardIds);
      const cards = Object.fromEntries(Object.entries(prev.cards).filter(([id]) => !removedCardIds.has(id)));
      return { ...prev, columns: prev.columns.filter((c) => c.id !== columnId), cards };
    });
  };

  const handleAddColumn = async () => {
    const title = newColumnTitle.trim();
    if (!title) return;
    const col = await apiCreateColumn(title, activeBoardId);
    setBoard((prev) => prev && { ...prev, columns: [...prev.columns, col] });
    setNewColumnTitle("");
    setAddingColumn(false);
  };

  const handleAddCard = async (
    columnId: string,
    title: string,
    details: string,
    importance: Importance = "medium",
    dueDate?: string | null,
    labelIds?: string[],
    storyPoints?: number | null,
    assignee?: string | null,
  ) => {
    const card = await apiCreateCard(columnId, title, details, importance, dueDate, labelIds, activeBoardId, storyPoints, assignee);
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

  const handleUpdateCard = async (
    cardId: string,
    title: string,
    details: string,
    importance: Importance,
    dueDate?: string | null,
    labelIds?: string[],
    storyPoints?: number | null,
    assignee?: string | null,
  ) => {
    setBoard((prev) =>
      prev && {
        ...prev,
        cards: {
          ...prev.cards,
          [cardId]: {
            ...prev.cards[cardId],
            title, details, importance, dueDate, storyPoints, assignee,
            labelIds: labelIds ?? prev.cards[cardId].labelIds,
          },
        },
      }
    );
    await apiUpdateCard(cardId, title, details, importance, dueDate, labelIds, activeBoardId, storyPoints, assignee);
  };

  const handleCardChange = (card: Card) => {
    setBoard((prev) => prev && { ...prev, cards: { ...prev.cards, [card.id]: card } });
  };

  const handleWipLimitChange = (columnId: string, wipLimit: number | null) => {
    setBoard((prev) =>
      prev && {
        ...prev,
        columns: prev.columns.map((c) => (c.id === columnId ? { ...c, wipLimit } : c)),
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
    apiDeleteCard(cardId, activeBoardId);
  };

  const handleLabelsChange = (labels: Label[]) => {
    setBoard((prev) => prev && { ...prev, labels });
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  if (!board) return null;

  const highPriorityCount = Object.values(board.cards).filter((c) => c.importance === "high").length;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-[380px] w-[380px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.18)_0%,_rgba(32,157,215,0.04)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[460px] w-[460px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.14)_0%,_rgba(117,57,145,0.03)_55%,_transparent_75%)]" />

      <div className="relative flex flex-1 flex-col px-6 pb-10 pt-8">
        <header className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-[var(--stroke)] bg-white/85 px-6 py-4 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
                Kanban Studio
              </p>
              <h1 className="mt-0.5 font-display text-xl font-semibold text-[var(--navy-dark)]">
                {board.name}
              </h1>
            </div>
            <div className="hidden h-8 w-px bg-[var(--stroke)] sm:block" />
            <BoardSelector
              boards={boards}
              activeBoardId={activeBoardId ?? board.id}
              onSelectBoard={(id) => setActiveBoardId(id)}
              onBoardsChange={setBoards}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              {highPriorityCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {highPriorityCount} high
                </span>
              )}
            </div>
            <UserMenu user={user} onLogout={onLogout} />
          </div>
        </header>

        <div className="mb-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[300px]">
            <FilterBar filter={filter} labels={board.labels} onChange={setFilter} />
          </div>
          <BoardStats board={board} />
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="board-scroll flex flex-1 gap-4 overflow-x-auto pb-2 pr-4">
            {board.columns.map((column) => {
              const allCards = column.cardIds.map((id) => board.cards[id]).filter(Boolean);
              const visibleCards = filteredCardIds ? allCards.filter((c) => filteredCardIds.has(c.id)) : allCards;
              return (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={visibleCards}
                  allCardCount={allCards.length}
                  labels={board.labels}
                  boardId={activeBoardId}
                  onRename={handleRenameColumn}
                  onDeleteColumn={handleDeleteColumn}
                  onWipLimitChange={handleWipLimitChange}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCard}
                  onUpdateCard={handleUpdateCard}
                  onLabelsChange={handleLabelsChange}
                  onCardChange={handleCardChange}
                />
              );
            })}

            <div className="flex flex-col gap-2 min-w-[200px] shrink-0">
              {addingColumn ? (
                <div className="flex flex-col gap-2 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-3.5">
                  <input
                    autoFocus
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddColumn();
                      if (e.key === "Escape") { setAddingColumn(false); setNewColumnTitle(""); }
                    }}
                    placeholder="Column title"
                    className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm font-medium text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddColumn}
                      className="rounded-full bg-[var(--secondary-purple)] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddingColumn(false); setNewColumnTitle(""); }}
                      className="rounded-full border border-[var(--stroke)] px-3 py-1.5 text-xs text-[var(--gray-text)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingColumn(true)}
                  className="rounded-2xl border border-dashed border-[var(--stroke)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--primary-blue)] transition hover:border-[var(--primary-blue)] hover:bg-white/60"
                >
                  + Add column
                </button>
              )}
            </div>
          </div>
          <DragOverlay>
            {activeCard ? (
              <div className="w-[220px]">
                <KanbanCardPreview card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <AISidebar boardId={activeBoardId} onBoardUpdate={setBoard} />
    </div>
  );
};
