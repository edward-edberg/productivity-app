import { useState, type FormEvent } from "react";
import clsx from "clsx";
import type { Importance, Label } from "@/lib/kanban";
import { IMPORTANCE_CONFIG } from "@/lib/kanban";
import { LabelPicker } from "@/components/LabelPicker";

const initialFormState = { title: "", details: "", importance: "medium" as Importance, dueDate: "" };

type NewCardFormProps = {
  labels?: Label[];
  boardId?: number;
  onLabelsChange?: (labels: Label[]) => void;
  onAdd: (title: string, details: string, importance: Importance, dueDate?: string | null, labelIds?: string[]) => void;
};

export const NewCardForm = ({ labels = [], boardId, onLabelsChange, onAdd }: NewCardFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useState(initialFormState);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.title.trim()) return;
    onAdd(formState.title.trim(), formState.details.trim(), formState.importance, formState.dueDate || null, selectedLabelIds);
    setFormState(initialFormState);
    setSelectedLabelIds([]);
    setIsOpen(false);
  };

  return (
    <div className="mt-4">
      {isOpen ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={formState.title}
            onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))}
            placeholder="Card title"
            className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm font-medium text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
            required
          />
          <textarea
            value={formState.details}
            onChange={(e) => setFormState((p) => ({ ...p, details: e.target.value }))}
            placeholder="Details"
            rows={2}
            className="w-full resize-none rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--gray-text)] outline-none transition focus:border-[var(--primary-blue)]"
          />
          <div className="flex gap-1.5">
            {(["low", "medium", "high"] as Importance[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setFormState((p) => ({ ...p, importance: level }))}
                className={clsx(
                  "flex flex-1 items-center justify-center gap-1 rounded-xl border py-1.5 text-[10px] font-semibold uppercase tracking-wide transition",
                  formState.importance === level
                    ? level === "high"
                      ? "border-red-400 bg-red-50 text-red-600"
                      : level === "medium"
                        ? "border-amber-400 bg-amber-50 text-amber-600"
                        : "border-slate-300 bg-slate-50 text-slate-500"
                    : "border-[var(--stroke)] text-[var(--gray-text)] hover:border-[var(--navy-dark)]"
                )}
              >
                <span className={clsx("h-1.5 w-1.5 rounded-full", IMPORTANCE_CONFIG[level].dot)} />
                {IMPORTANCE_CONFIG[level].label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={formState.dueDate}
            onChange={(e) => setFormState((p) => ({ ...p, dueDate: e.target.value }))}
            className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm text-[var(--gray-text)] outline-none transition focus:border-[var(--primary-blue)]"
          />
          {onLabelsChange && (
            <LabelPicker
              labels={labels}
              selectedIds={selectedLabelIds}
              boardId={boardId}
              onChange={setSelectedLabelIds}
              onLabelsChange={onLabelsChange}
            />
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110"
            >
              Add card
            </button>
            <button
              type="button"
              onClick={() => { setIsOpen(false); setFormState(initialFormState); setSelectedLabelIds([]); }}
              className="rounded-full border border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full rounded-full border border-dashed border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--primary-blue)] transition hover:border-[var(--primary-blue)]"
        >
          Add a card
        </button>
      )}
    </div>
  );
};
