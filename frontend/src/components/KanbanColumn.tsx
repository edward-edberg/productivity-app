import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, Column, Importance } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  onRename: (columnId: string, title: string) => void;
  onAddCard: (columnId: string, title: string, details: string, importance: Importance, dueDate?: string | null) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
  onUpdateCard: (cardId: string, title: string, details: string, importance: Importance, dueDate?: string | null) => void;
};

export const KanbanColumn = ({
  column,
  cards,
  onRename,
  onAddCard,
  onDeleteCard,
  onUpdateCard,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const highCount = cards.filter((c) => c.importance === "high").length;

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        "flex min-h-[480px] min-w-[210px] flex-1 flex-col rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-3.5 transition",
        isOver ? "ring-2 ring-[var(--accent-yellow)] bg-[var(--surface-strong)]" : "hover:bg-[var(--surface-strong)]"
      )}
      data-testid={`column-${column.id}`}
    >
      <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--stroke)]">
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
        </div>
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-2">
        <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onDelete={(cardId) => onDeleteCard(column.id, cardId)}
              onUpdate={onUpdateCard}
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
        onAdd={(title, details, importance, dueDate) => onAddCard(column.id, title, details, importance, dueDate)}
      />
    </section>
  );
};
