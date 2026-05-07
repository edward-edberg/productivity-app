"use client";

import { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import type { Card, ChecklistItem, Comment, Importance, Label } from "@/lib/kanban";
import { IMPORTANCE_CONFIG, isOverdue, formatDueDate } from "@/lib/kanban";
import { LabelPicker } from "@/components/LabelPicker";
import {
  apiAddChecklistItem,
  apiUpdateChecklistItem,
  apiDeleteChecklistItem,
  apiListComments,
  apiCreateComment,
  apiDeleteComment,
} from "@/lib/api";

type KanbanCardProps = {
  card: Card;
  labels: Label[];
  boardId?: number;
  onDelete: (cardId: string) => void;
  onUpdate: (cardId: string, title: string, details: string, importance: Importance, dueDate?: string | null, labelIds?: string[], storyPoints?: number | null, assignee?: string | null) => void;
  onLabelsChange: (labels: Label[]) => void;
  onCardChange: (card: Card) => void;
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

const CommentIcon = () => (
  <svg width="11" height="11" viewBox="0 0 13 13" fill="none" aria-hidden>
    <path d="M11.5 8a1 1 0 01-1 1H4l-2.5 2.5V2a1 1 0 011-1h8a1 1 0 011 1v6z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type ChecklistEditorProps = {
  cardId: string;
  boardId?: number;
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
};

function ChecklistEditor({ cardId, boardId, items, onChange }: ChecklistEditorProps) {
  const [newText, setNewText] = useState("");

  const handleAdd = async () => {
    const text = newText.trim();
    if (!text) return;
    const item = await apiAddChecklistItem(cardId, text, boardId);
    onChange([...items, item]);
    setNewText("");
  };

  const handleToggle = async (item: ChecklistItem) => {
    const updated = { ...item, checked: !item.checked };
    onChange(items.map((i) => (i.id === item.id ? updated : i)));
    await apiUpdateChecklistItem(cardId, item.id, item.text, !item.checked, boardId);
  };

  const handleDelete = async (itemId: string) => {
    onChange(items.filter((i) => i.id !== itemId));
    await apiDeleteChecklistItem(cardId, itemId, boardId);
  };

  const handleUpdateText = async (item: ChecklistItem, text: string) => {
    if (!text.trim()) return;
    onChange(items.map((i) => (i.id === item.id ? { ...i, text } : i)));
    await apiUpdateChecklistItem(cardId, item.id, text, item.checked, boardId);
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">Checklist</p>
      {items.map((item) => (
        <div key={item.id} className="group/item flex items-center gap-2">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={() => handleToggle(item)}
            className="h-3.5 w-3.5 flex-shrink-0 cursor-pointer rounded accent-[var(--secondary-purple)]"
          />
          <input
            defaultValue={item.text}
            onBlur={(e) => handleUpdateText(item, e.target.value)}
            className={clsx(
              "flex-1 bg-transparent text-xs outline-none",
              item.checked ? "line-through text-[var(--gray-text)]" : "text-[var(--navy-dark)]"
            )}
          />
          <button
            type="button"
            onClick={() => handleDelete(item.id)}
            className="opacity-0 group-hover/item:opacity-100 text-[var(--gray-text)] hover:text-red-500 text-xs leading-none transition"
            aria-label="Delete checklist item"
          >
            ×
          </button>
        </div>
      ))}
      <div className="flex gap-1.5">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Add item..."
          className="flex-1 rounded-lg border border-[var(--stroke)] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[var(--primary-blue)]"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-lg bg-[var(--secondary-purple)] px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          disabled={!newText.trim()}
        >
          Add
        </button>
      </div>
    </div>
  );
}

type CommentThreadProps = {
  cardId: string;
  boardId?: number;
  onCountChange: (count: number) => void;
};

function CommentThread({ cardId, boardId, onCountChange }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newText, setNewText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiListComments(cardId, boardId).then((data) => {
      setComments(data);
      onCountChange(data.length);
      setLoading(false);
    });
  }, [cardId, boardId]);

  const handleAdd = async () => {
    const text = newText.trim();
    if (!text) return;
    const comment = await apiCreateComment(cardId, text, boardId);
    const updated = [...comments, comment];
    setComments(updated);
    onCountChange(updated.length);
    setNewText("");
  };

  const handleDelete = async (commentId: string) => {
    await apiDeleteComment(cardId, commentId, boardId);
    const updated = comments.filter((c) => c.id !== commentId);
    setComments(updated);
    onCountChange(updated.length);
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">Comments</p>
      {loading ? (
        <p className="text-xs text-[var(--gray-text)]">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-[var(--gray-text)]">No comments yet</p>
      ) : (
        <div className="space-y-2 max-h-[140px] overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="group/comment flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-[var(--navy-dark)]">{c.username}</p>
                <p className="text-xs text-[var(--gray-text)] mt-0.5 break-words">{c.text}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(c.id)}
                className="mt-0.5 opacity-0 group-hover/comment:opacity-100 text-[var(--gray-text)] hover:text-red-500 text-xs transition"
                aria-label="Delete comment"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Add a comment..."
          className="flex-1 rounded-lg border border-[var(--stroke)] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[var(--primary-blue)]"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-lg bg-[var(--primary-blue)] px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          disabled={!newText.trim()}
        >
          Post
        </button>
      </div>
    </div>
  );
}

type EditModalProps = {
  card: Card;
  labels: Label[];
  boardId?: number;
  onSave: (title: string, details: string, importance: Importance, dueDate?: string | null, labelIds?: string[], storyPoints?: number | null, assignee?: string | null) => void;
  onClose: () => void;
  onLabelsChange: (labels: Label[]) => void;
  onChecklistChange: (items: ChecklistItem[]) => void;
  onCommentCountChange: (count: number) => void;
};

function EditModal({ card, labels, boardId, onSave, onClose, onLabelsChange, onChecklistChange, onCommentCountChange }: EditModalProps) {
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);
  const [importance, setImportance] = useState<Importance>(card.importance ?? "medium");
  const [dueDate, setDueDate] = useState(card.dueDate ?? "");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(card.labelIds ?? []);
  const [storyPoints, setStoryPoints] = useState<string>(card.storyPoints != null ? String(card.storyPoints) : "");
  const [assignee, setAssignee] = useState<string>(card.assignee ?? "");
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(card.checklistItems ?? []);

  const handleChecklistChange = (items: ChecklistItem[]) => {
    setChecklistItems(items);
    onChecklistChange(items);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[480px] max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--stroke)] bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.18)]"
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
          <input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="Assignee (username)"
            className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--gray-text)] outline-none transition focus:border-[var(--primary-blue)]"
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
          <div className="flex gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--gray-text)] outline-none transition focus:border-[var(--primary-blue)]"
            />
            <div className="relative flex items-center">
              <input
                type="number"
                min={1}
                max={999}
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                placeholder="SP"
                className="w-20 rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--gray-text)] outline-none transition focus:border-[var(--primary-blue)]"
              />
              <span className="pointer-events-none absolute right-3 text-[10px] text-[var(--gray-text)]">pts</span>
            </div>
          </div>
          <LabelPicker
            labels={labels}
            selectedIds={selectedLabelIds}
            boardId={boardId}
            onChange={setSelectedLabelIds}
            onLabelsChange={onLabelsChange}
          />
          <ChecklistEditor
            cardId={card.id}
            boardId={boardId}
            items={checklistItems}
            onChange={handleChecklistChange}
          />
          <div className="border-t border-[var(--stroke)] pt-3">
            <CommentThread
              cardId={card.id}
              boardId={boardId}
              onCountChange={onCommentCountChange}
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onSave(
              title.trim(),
              details.trim(),
              importance,
              dueDate || null,
              selectedLabelIds,
              storyPoints ? parseInt(storyPoints, 10) : null,
              assignee.trim() || null,
            )}
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

export const KanbanCard = ({ card, labels, boardId, onDelete, onUpdate, onLabelsChange, onCardChange }: KanbanCardProps) => {
  const [editing, setEditing] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const importance = card.importance ?? "medium";
  const overdue = isOverdue(card.dueDate);
  const cardLabels = (card.labelIds ?? []).map((id) => labels.find((l) => l.id === id)).filter(Boolean) as Label[];
  const checklistItems = card.checklistItems ?? [];
  const checklistDone = checklistItems.filter((i) => i.checked).length;
  const checklistTotal = checklistItems.length;
  const commentCount = card.commentCount ?? 0;

  return (
    <>
      {editing && (
        <EditModal
          card={card}
          labels={labels}
          boardId={boardId}
          onSave={(title, details, imp, dd, labelIds, sp, assignee) => {
            onUpdate(card.id, title, details, imp, dd, labelIds, sp, assignee);
            setEditing(false);
          }}
          onClose={() => setEditing(false)}
          onLabelsChange={onLabelsChange}
          onChecklistChange={(items) => onCardChange({ ...card, checklistItems: items })}
          onCommentCountChange={(count) => onCardChange({ ...card, commentCount: count })}
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
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {card.dueDate && (
                <p className={clsx(
                  "text-[10px] font-semibold uppercase tracking-wide",
                  overdue ? "text-red-500" : "text-[var(--gray-text)]"
                )}>
                  {overdue ? "⚠ " : ""}{formatDueDate(card.dueDate)}
                </p>
              )}
              {card.storyPoints != null && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500">
                  {card.storyPoints} pts
                </span>
              )}
              {checklistTotal > 0 && (
                <span className={clsx(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold",
                  checklistDone === checklistTotal
                    ? "bg-green-100 text-green-600"
                    : "bg-slate-100 text-slate-500"
                )}>
                  ✓ {checklistDone}/{checklistTotal}
                </span>
              )}
              {commentCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-500">
                  <CommentIcon /> {commentCount}
                </span>
              )}
              {card.assignee && (
                <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[9px] font-semibold text-purple-600">
                  @{card.assignee}
                </span>
              )}
            </div>
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
