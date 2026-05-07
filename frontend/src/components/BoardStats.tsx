"use client";

import type { BoardData } from "@/lib/kanban";

type BoardStatsProps = {
  board: BoardData;
};

export const BoardStats = ({ board }: BoardStatsProps) => {
  const cards = Object.values(board.cards);
  const total = cards.length;
  const high = cards.filter((c) => c.importance === "high").length;
  const medium = cards.filter((c) => c.importance === "medium").length;
  const low = cards.filter((c) => c.importance === "low").length;
  const overdue = cards.filter((c) => {
    if (!c.dueDate) return false;
    return new Date(c.dueDate) < new Date(new Date().toDateString());
  }).length;

  const totalPoints = cards.reduce((sum, c) => sum + (c.storyPoints ?? 0), 0);
  const doneCol = board.columns[board.columns.length - 1];
  const doneCount = doneCol?.cardIds.length ?? 0;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  if (total === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--stroke)] bg-white/90 px-4 py-2.5 text-xs backdrop-blur">
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-[var(--navy-dark)]">{total}</span>
        <span className="text-[var(--gray-text)]">cards</span>
      </div>

      <div className="hidden sm:block w-px h-4 bg-[var(--stroke)]" />

      <div className="flex items-center gap-3">
        {high > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="font-semibold">{high}</span> high
          </span>
        )}
        {medium > 0 && (
          <span className="flex items-center gap-1 text-amber-600">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="font-semibold">{medium}</span> med
          </span>
        )}
        {low > 0 && (
          <span className="flex items-center gap-1 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            <span className="font-semibold">{low}</span> low
          </span>
        )}
      </div>

      {totalPoints > 0 && (
        <>
          <div className="hidden sm:block w-px h-4 bg-[var(--stroke)]" />
          <span className="flex items-center gap-1 text-slate-600">
            <span className="font-semibold">{totalPoints}</span> pts
          </span>
        </>
      )}

      {overdue > 0 && (
        <>
          <div className="hidden sm:block w-px h-4 bg-[var(--stroke)]" />
          <span className="flex items-center gap-1 text-red-500 font-semibold">
            ⚠ {overdue} overdue
          </span>
        </>
      )}

      <div className="hidden sm:block w-px h-4 bg-[var(--stroke)]" />

      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="flex-1 h-1.5 rounded-full bg-[var(--stroke)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--secondary-purple)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[var(--gray-text)] tabular-nums whitespace-nowrap">
          <span className="font-semibold text-[var(--navy-dark)]">{doneCount}</span>/{total} done
        </span>
      </div>
    </div>
  );
};
