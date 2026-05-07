"use client";

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import type { BoardSummary } from "@/lib/kanban";
import { apiCreateBoard, apiRenameBoard, apiDeleteBoard } from "@/lib/api";

type BoardSelectorProps = {
  boards: BoardSummary[];
  activeBoardId: number;
  onSelectBoard: (boardId: number) => void;
  onBoardsChange: (boards: BoardSummary[]) => void;
};

export const BoardSelector = ({ boards, activeBoardId, onSelectBoard, onBoardsChange }: BoardSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeBoard = boards.find((b) => b.id === activeBoardId);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const created = await apiCreateBoard(name);
    const updated = [...boards, { id: created.id, name: created.name, created_at: new Date().toISOString() }];
    onBoardsChange(updated);
    onSelectBoard(created.id);
    setNewName("");
    setCreating(false);
    setOpen(false);
  };

  const handleRename = async (boardId: number) => {
    const name = renameVal.trim();
    if (!name) return;
    await apiRenameBoard(boardId, name);
    onBoardsChange(boards.map((b) => (b.id === boardId ? { ...b, name } : b)));
    setRenamingId(null);
  };

  const handleDelete = async (boardId: number) => {
    try {
      await apiDeleteBoard(boardId);
      const updated = boards.filter((b) => b.id !== boardId);
      onBoardsChange(updated);
      if (boardId === activeBoardId && updated.length > 0) {
        onSelectBoard(updated[0].id);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Cannot delete board";
      alert(msg);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-[var(--stroke)] bg-white px-3 py-1.5 text-sm font-semibold text-[var(--navy-dark)] shadow-sm transition hover:border-[var(--primary-blue)]"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        <span className="max-w-[120px] truncate">{activeBoard?.name ?? "Select board"}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden className={clsx("transition-transform", open && "rotate-180")}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-2xl border border-[var(--stroke)] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="p-1">
            {boards.map((board) => (
              <div
                key={board.id}
                className={clsx(
                  "group flex items-center gap-1 rounded-xl px-2 py-2 transition",
                  board.id === activeBoardId ? "bg-[var(--surface)]" : "hover:bg-[var(--surface)]"
                )}
              >
                {renamingId === board.id ? (
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onBlur={() => handleRename(board.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(board.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="flex-1 bg-transparent text-sm font-medium text-[var(--navy-dark)] outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => { onSelectBoard(board.id); setOpen(false); }}
                    className="flex-1 text-left text-sm font-medium text-[var(--navy-dark)] truncate"
                  >
                    {board.name}
                  </button>
                )}
                <div className="flex opacity-0 group-hover:opacity-100 transition">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setRenamingId(board.id); setRenameVal(board.name); }}
                    className="p-1 rounded-lg text-[var(--gray-text)] hover:text-[var(--navy-dark)] hover:bg-[var(--surface-strong)]"
                    aria-label="Rename board"
                  >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M8 1l2 2L3.5 9H1.5v-2L8 1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  {boards.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(board.id); }}
                      className="p-1 rounded-lg text-[var(--gray-text)] hover:text-red-500 hover:bg-red-50"
                      aria-label="Delete board"
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 3h8M3.5 3V2a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M2.5 3l.5 6h5l.5-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--stroke)] p-2">
            {creating ? (
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setCreating(false);
                  }}
                  placeholder="Board name"
                  className="flex-1 rounded-lg border border-[var(--stroke)] bg-white px-2 py-1.5 text-xs font-medium text-[var(--navy-dark)] outline-none focus:border-[var(--primary-blue)]"
                />
                <button type="button" onClick={handleCreate} className="rounded-lg bg-[var(--secondary-purple)] px-2.5 py-1.5 text-xs font-semibold text-white">Add</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full rounded-xl border border-dashed border-[var(--stroke)] py-2 text-xs font-semibold uppercase tracking-wide text-[var(--primary-blue)] transition hover:border-[var(--primary-blue)]"
              >
                + New board
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
