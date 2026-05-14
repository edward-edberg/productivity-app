"use client";

import clsx from "clsx";
import type { Importance, Label } from "@/lib/kanban";
import { IMPORTANCE_CONFIG } from "@/lib/kanban";

export type FilterState = {
  search: string;
  importance: Importance | "";
  labelIds: string[];
};

export const emptyFilter: FilterState = { search: "", importance: "", labelIds: [] };

type FilterBarProps = {
  filter: FilterState;
  labels: Label[];
  onChange: (f: FilterState) => void;
};

export const FilterBar = ({ filter, labels = [], onChange }: FilterBarProps) => {
  const active =
    filter.search !== "" || filter.importance !== "" || filter.labelIds.length > 0;

  const toggleLabel = (id: string) => {
    const next = filter.labelIds.includes(id)
      ? filter.labelIds.filter((x) => x !== id)
      : [...filter.labelIds, id];
    onChange({ ...filter, labelIds: next });
  };

  return (
    <div className={clsx(
      "flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--stroke)] bg-white/90 px-4 py-2.5 backdrop-blur transition",
      active && "border-[var(--primary-blue)]/30 bg-blue-50/50"
    )}>
      {/* Search input */}
      <div className="flex items-center gap-2 flex-1 min-w-[160px]">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden className="text-[var(--gray-text)] flex-shrink-0">
          <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3" />
          <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={filter.search}
          onChange={(e) => onChange({ ...filter, search: e.target.value })}
          placeholder="Search cards..."
          className="flex-1 bg-transparent text-xs text-[var(--navy-dark)] placeholder:text-[var(--gray-text)] outline-none"
        />
        {filter.search && (
          <button
            type="button"
            onClick={() => onChange({ ...filter, search: "" })}
            className="text-[var(--gray-text)] hover:text-[var(--navy-dark)] text-sm leading-none"
          >
            ×
          </button>
        )}
      </div>

      <div className="w-px h-4 bg-[var(--stroke)] hidden sm:block" />

      {/* Importance filter */}
      <div className="flex gap-1">
        {(["high", "medium", "low"] as Importance[]).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange({ ...filter, importance: filter.importance === level ? "" : level })}
            className={clsx(
              "flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition",
              filter.importance === level
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

      {/* Label filter */}
      {labels.length > 0 && (
        <>
          <div className="w-px h-4 bg-[var(--stroke)] hidden sm:block" />
          <div className="flex flex-wrap gap-1">
            {labels.map((label) => {
              const selected = filter.labelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggleLabel(label.id)}
                  className={clsx(
                    "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition",
                    selected ? "border-transparent text-white" : "border-[var(--stroke)] text-[var(--navy-dark)]"
                  )}
                  style={selected ? { backgroundColor: label.color } : {}}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: selected ? "rgba(255,255,255,0.6)" : label.color }} />
                  {label.name}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Clear all */}
      {active && (
        <button
          type="button"
          onClick={() => onChange(emptyFilter)}
          className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-[var(--primary-blue)] hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
};
