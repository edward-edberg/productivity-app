"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card, Importance, Label } from "@/lib/kanban";
import { IMPORTANCE_CONFIG, isOverdue, formatDueDate } from "@/lib/kanban";
import { LabelPicker } from "@/components/LabelPicker";

type KanbanCardProps = {
  card: Card;
  labels: Label[];
  boardId?: number;
  onDelete: (cardId: string) => void;
  onUpdate: (cardId: string, title: string, details: string, importance: Importance, dueDate?: string | null, labelIds?: string[]) => void;
  onLabelsChange: (labels: Label[]) => void;
};

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
    <path d="M1.5 3h10M4.5 3V2a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M2.5 3l.75 8h7.5l.75-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
    <path d="M9.5 1.5l2 2L4 11H2v-2l7.5-7.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type EditModalProps = {
  card: Card;
  labels: Label[];
  boardId?: number;
  onSave: (title: string, details: string, importance: Importance, dueDate?: string | null, labelIds?: string[]) => void;
  onClose: () => void;
  onLabelsChange: (labels: Label[]) => void;
};

function EditModal({ card, labels, boardId, onSave, onClose, onLabelsChange }: EditModalProps) {
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);
  const [importance, setImportance] = useState<Importance>(card.importance ?? "medium");
  const [dueDate, setDueDate] = useState(card.dueDate ?? "");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(card.labelIds ?? []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[400px] max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--stroke)] bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 font-display text-base font-semibold text-[var(--navy-dark)]">Edit card</h3>
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Card title"
            className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
          />
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Details"
            rows={3}
            className="w-full resize-none rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--gray-text)] outline-none transition focus:border-[var(--primary-blue)]"
          />
          <div className="flex gap-2">
            {(["low", "medium", "high"] as Importance[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setImportance(level)}
                className={clsx(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition",
                  importance === level
                    ? level === "high"
                      ? "border-red-400 bg-red-50 text-red-600"
                      : level === "medium"
                        ? "border-amber-400 bg-amber-50 text-amber-600"
                        : "border-slate-300 bg-slate-50 text-slate-500"
                    : "border-[var(--stroke)] text-[var(--gray-text)] hover:border-[var(--navy-dark)]"
                )}
              >
                <span className={clsx("h-2 w-2 rounded-full", IMPORTANCE_CONFIG[level].dot)} />
                {IMPORTANCE_CONFIG[level].label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--gray-text)] outline-none transition focus:border-[var(--primary-blue)]"
          />
          <LabelPicker
            labels={labels}
            selectedIds={selectedLabelIds}
            boardId={boardId}
            onChange={setSelectedLabelIds}
            onLabelsChange={onLabelsChange}
          />
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onSave(title.trim(), details.trim(), importance, dueDate || null, selectedLabelIds)}
            className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export const KanbanCard = ({ card, labels, boardId, onDelete, onUpdate, onLabelsChange }: KanbanCardProps) => {
  const [editing, setEditing] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const importance = card.importance ?? "medium";
  const overdue = isOverdue(card.dueDate);
  const cardLabels = (card.labelIds ?? []).map((id) => labels.find((l) => l.id === id)).filter(Boolean) as Label[];

  return (
    <>
      {editing && (
        <EditModal
          card={card}
          labels={labels}
          boardId={boardId}
          onSave={(title, details, imp, dd, labelIds) => {
            onUpdate(card.id, title, details, imp, dd, labelIds);
            setEditing(false);
          }}
          onClose={() => setEditing(false)}
          onLabelsChange={onLabelsChange}
        />
      )}
      <article
        ref={setNodeRef}
        style={style}
        className={clsx(
          "group relative rounded-2xl border bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(3,33,71,0.07)]",
          "transition-all duration-150 hover:shadow-[0_4px_16px_rgba(3,33,71,0.11)]",
          isDragging && "opacity-60 shadow-[0_18px_32px_rgba(3,33,71,0.16)]",
          importance === "high"
            ? "border-red-300 shadow-[0_2px_12px_rgba(239,68,68,0.22)] ring-1 ring-red-300"
            : importance === "medium"
              ? "border-amber-200 hover:border-amber-300"
              : "border-transparent hover:border-[var(--stroke)]"
        )}
        {...attributes}
        {...listeners}
        data-testid={`card-${card.id}`}
      >
        {importance === "high" && (
          <div className="pointer-events-none absolute -inset-px rounded-2xl bg-[radial-gradient(ellipse_at_top_right,_rgba(239,68,68,0.08),_transparent_70%)]" />
        )}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={clsx("inline-block h-2 w-2 rounded-full flex-shrink-0", IMPORTANCE_CONFIG[importance].dot)} />
              <h4 className="font-display text-sm font-semibold leading-snug text-[var(--navy-dark)]">{card.title}</h4>
            </div>
            {card.details && (
              <p className="mt-1 text-xs leading-5 text-[var(--gray-text)]">{card.details}</p>
            )}
            {cardLabels.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {cardLabels.map((label) => (
                  <span
                    key={label.id}
                    className="rounded-full px-2 py-0.5 text-[9px] font-semibold text-white"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            )}
            {card.dueDate && (
              <p className={clsx(
                "mt-1.5 text-[10px] font-semibold uppercase tracking-wide",
                overdue ? "text-red-500" : "text-[var(--gray-text)]"
              )}>
                {overdue ? "⚠ " : ""}{formatDueDate(card.dueDate)}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1 mt-0.5 opacity-0 transition-all group-hover:opacity-100">
            <button
              type="button"
              onClick={() => setEditing(true)}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--gray-text)] transition hover:bg-blue-50 hover:text-blue-500"
              aria-label={`Edit ${card.title}`}
            >
              <EditIcon />
            </button>
            <button
              type="button"
              onClick={() => onDelete(card.id)}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--gray-text)] transition hover:bg-red-50 hover:text-red-500"
              aria-label={`Delete ${card.title}`}
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </article>
    </>
  );
};
