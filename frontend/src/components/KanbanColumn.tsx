import { useState } from "react";
import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, Column, Importance, Label } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  labels: Label[];
  boardId?: number;
  onRename: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onAddCard: (columnId: string, title: string, details: string, importance: Importance, dueDate?: string | null, labelIds?: string[]) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
  onUpdateCard: (cardId: string, title: string, details: string, importance: Importance, dueDate?: string | null, labelIds?: string[]) => void;
  onLabelsChange: (labels: Label[]) => void;
};

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 13 13" fill="none" aria-hidden>
    <path d="M1.5 3h10M4.5 3V2a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M2.5 3l.75 8h7.5l.75-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const KanbanColumn = ({
  column,
  cards,
  labels,
  boardId,
  onRename,
  onDeleteColumn,
  onAddCard,
  onDeleteCard,
  onUpdateCard,
  onLabelsChange,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const highCount = cards.filter((c) => c.importance === "high").length;

  const handleDeleteClick = () => {
    if (confirmDelete) {
      onDeleteColumn(column.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "flex min-h-[480px] min-w-[210px] flex-1 flex-col rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-3.5 transition",
        isOver ? "ring-2 ring-[var(--accent-yellow)] bg-[var(--surface-strong)]" : "hover:bg-[var(--surface-strong)]"
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
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
            {cards.length}
          </span>
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
        onAdd={(title, details, importance, dueDate, labelIds) =>
          onAddCard(column.id, title, details, importance, dueDate, labelIds)
        }
      />
    </section>
  );
};
