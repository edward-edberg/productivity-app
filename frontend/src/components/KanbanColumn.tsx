import { useState } from "react";
import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, Column, Importance, Label } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";
import { apiSetWipLimit } from "@/lib/api";

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  allCardCount: number;
  labels: Label[];
  boardId?: number;
  onRename: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onWipLimitChange: (columnId: string, wipLimit: number | null) => void;
  onAddCard: (columnId: string, title: string, details: string, importance: Importance, dueDate?: string | null, labelIds?: string[], storyPoints?: number | null) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
  onUpdateCard: (cardId: string, title: string, details: string, importance: Importance, dueDate?: string | null, labelIds?: string[], storyPoints?: number | null) => void;
  onLabelsChange: (labels: Label[]) => void;
  onCardChange: (card: Card) => void;
};

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 13 13" fill="none" aria-hidden>
    <path d="M1.5 3h10M4.5 3V2a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M2.5 3l.75 8h7.5l.75-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const KanbanColumn = ({
  column,
  cards,
  allCardCount,
  labels,
  boardId,
  onRename,
  onDeleteColumn,
  onWipLimitChange,
  onAddCard,
  onDeleteCard,
  onUpdateCard,
  onLabelsChange,
  onCardChange,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingWip, setEditingWip] = useState(false);
  const [wipInput, setWipInput] = useState(column.wipLimit != null ? String(column.wipLimit) : "");

  const highCount = cards.filter((c) => c.importance === "high").length;
  const wipLimit = column.wipLimit;
  const isOverWip = wipLimit != null && allCardCount > wipLimit;
  const isAtWip = wipLimit != null && allCardCount === wipLimit;

  const handleDeleteClick = () => {
    if (confirmDelete) {
      onDeleteColumn(column.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const handleWipSave = async () => {
    const val = wipInput.trim();
    const limit = val ? parseInt(val, 10) : null;
    if (val && (isNaN(limit!) || limit! < 1)) return;
    await apiSetWipLimit(column.id, limit, boardId);
    onWipLimitChange(column.id, limit);
    setEditingWip(false);
  };

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "flex min-h-[480px] min-w-[210px] flex-1 flex-col rounded-2xl border p-3.5 transition",
        isOverWip
          ? "border-red-300 bg-red-50/30"
          : isAtWip
            ? "border-amber-300 bg-amber-50/20"
            : "border-[var(--stroke)] bg-[var(--surface)]",
        isOver ? "ring-2 ring-[var(--accent-yellow)] bg-[var(--surface-strong)]" : (!isOverWip && !isAtWip) && "hover:bg-[var(--surface-strong)]"
      )}
      data-testid={`column-${column.id}`}
    >
      <div className="group/header flex items-center gap-2.5 pb-3 border-b border-[var(--stroke)]">
        <div className="h-1.5 w-6 rounded-full bg-[var(--accent-yellow)]" />
        <input
          value={column.title}
          onChange={(e) => onRename(column.id, e.target.value)}
          className="flex-1 min-w-0 bg-transparent font-display text-sm font-semibold text-[var(--navy-dark)] outline-none"
          aria-label="Column title"
        />
        <div className="flex items-center gap-1.5">
          {highCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {highCount}
            </span>
          )}
          {editingWip ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={wipInput}
                onChange={(e) => setWipInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleWipSave(); if (e.key === "Escape") setEditingWip(false); }}
                placeholder="—"
                className="w-10 rounded-md border border-[var(--stroke)] bg-white px-1.5 py-0.5 text-center text-[10px] outline-none focus:border-[var(--primary-blue)]"
              />
              <button type="button" onClick={handleWipSave} className="text-[10px] font-semibold text-[var(--primary-blue)] hover:underline">✓</button>
              <button type="button" onClick={() => setEditingWip(false)} className="text-[10px] text-[var(--gray-text)] hover:text-[var(--navy-dark)]">✕</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingWip(true)}
              className={clsx(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition",
                isOverWip
                  ? "bg-red-100 text-red-600"
                  : isAtWip
                    ? "bg-amber-100 text-amber-600"
                    : "text-[var(--gray-text)] hover:bg-[var(--stroke)]"
              )}
              title={wipLimit ? `WIP limit: ${wipLimit} — click to change` : "Set WIP limit"}
            >
              {wipLimit != null ? `${allCardCount}/${wipLimit}` : allCardCount}
            </button>
          )}
          <button
            type="button"
            onClick={handleDeleteClick}
            className={clsx(
              "flex h-5 w-5 items-center justify-center rounded-full transition opacity-0 group-hover/header:opacity-100",
              confirmDelete
                ? "bg-red-500 text-white opacity-100"
                : "text-[var(--gray-text)] hover:bg-red-50 hover:text-red-500"
            )}
            aria-label={confirmDelete ? "Confirm delete column" : `Delete column ${column.title}`}
            title={confirmDelete ? "Click again to confirm" : "Delete column"}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
      {isOverWip && (
        <div className="mt-2 rounded-lg bg-red-100 px-2.5 py-1 text-[10px] font-semibold text-red-600">
          WIP limit exceeded ({allCardCount}/{wipLimit})
        </div>
      )}
      <div className="mt-3 flex flex-1 flex-col gap-2">
        <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              labels={labels}
              boardId={boardId}
              onDelete={(cardId) => onDeleteCard(column.id, cardId)}
              onUpdate={onUpdateCard}
              onLabelsChange={onLabelsChange}
              onCardChange={onCardChange}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--stroke)] px-3 py-6 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
            Drop here
          </div>
        )}
      </div>
      <NewCardForm
        labels={labels}
        boardId={boardId}
        onLabelsChange={onLabelsChange}
        onAdd={(title, details, importance, dueDate, labelIds, storyPoints) =>
          onAddCard(column.id, title, details, importance, dueDate, labelIds, storyPoints)
        }
      />
    </section>
  );
};
