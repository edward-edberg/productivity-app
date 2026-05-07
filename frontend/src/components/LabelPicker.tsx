"use client";

import { useState } from "react";
import clsx from "clsx";
import type { Label } from "@/lib/kanban";
import { apiCreateLabel, apiDeleteLabel } from "@/lib/api";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
];

type LabelPickerProps = {
  labels: Label[];
  selectedIds: string[];
  boardId?: number;
  onChange: (selectedIds: string[]) => void;
  onLabelsChange: (labels: Label[]) => void;
};

export const LabelPicker = ({ labels, selectedIds, boardId, onChange, onLabelsChange }: LabelPickerProps) => {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[4]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const label = await apiCreateLabel(name, newColor, boardId);
    onLabelsChange([...labels, label]);
    onChange([...selectedIds, label.id]);
    setNewName("");
    setNewColor(PRESET_COLORS[4]);
    setCreating(false);
  };

  const handleDeleteLabel = async (labelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await apiDeleteLabel(labelId, boardId);
    onLabelsChange(labels.filter((l) => l.id !== labelId));
    onChange(selectedIds.filter((id) => id !== labelId));
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">Labels</p>
      <div className="flex flex-wrap gap-1.5">
        {labels.map((label) => {
          const selected = selectedIds.includes(label.id);
          return (
            <button
              key={label.id}
              type="button"
              onClick={() => toggle(label.id)}
              className={clsx(
                "group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                selected ? "border-transparent text-white" : "border-[var(--stroke)] text-[var(--navy-dark)] bg-white"
              )}
              style={selected ? { backgroundColor: label.color } : {}}
            >
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: selected ? "rgba(255,255,255,0.6)" : label.color }}
              />
              {label.name}
              <span
                role="button"
                onClick={(e) => handleDeleteLabel(label.id, e)}
                className="ml-0.5 opacity-0 group-hover:opacity-100 text-[10px] leading-none hover:text-red-400 transition"
                aria-label={`Delete label ${label.name}`}
              >
                ×
              </span>
            </button>
          );
        })}
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-full border border-dashed border-[var(--stroke)] px-2.5 py-1 text-xs text-[var(--primary-blue)] transition hover:border-[var(--primary-blue)]"
          >
            + New label
          </button>
        )}
      </div>
      {creating && (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={clsx(
                  "h-5 w-5 rounded-full transition",
                  newColor === c && "ring-2 ring-offset-1 ring-[var(--navy-dark)]"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setCreating(false);
            }}
            placeholder="Label name"
            className="flex-1 rounded-xl border border-[var(--stroke)] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[var(--primary-blue)]"
          />
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-lg bg-[var(--secondary-purple)] px-2.5 py-1.5 text-xs font-semibold text-white"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="rounded-lg border border-[var(--stroke)] px-2 py-1.5 text-xs text-[var(--gray-text)]"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
