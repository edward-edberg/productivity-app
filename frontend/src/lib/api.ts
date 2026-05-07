import type { BoardData, BoardSummary, Card, Importance } from "./kanban";

function boardParam(boardId?: number): string {
  return boardId !== undefined ? `?boardId=${boardId}` : "";
}

export async function fetchBoard(boardId?: number): Promise<BoardData> {
  const res = await fetch(`/api/board${boardParam(boardId)}`);
  if (!res.ok) throw new Error("Failed to fetch board");
  return res.json();
}

export async function fetchBoards(): Promise<BoardSummary[]> {
  const res = await fetch("/api/boards");
  if (!res.ok) throw new Error("Failed to fetch boards");
  return res.json();
}

export async function apiCreateBoard(name: string): Promise<{ id: number; name: string }> {
  const res = await fetch("/api/boards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create board");
  return res.json();
}

export async function apiRenameBoard(boardId: number, name: string): Promise<void> {
  await fetch(`/api/boards/${boardId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function apiDeleteBoard(boardId: number): Promise<void> {
  const res = await fetch(`/api/boards/${boardId}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? "Failed to delete board");
  }
}

export async function apiRenameColumn(columnId: string, title: string, boardId?: number): Promise<void> {
  await fetch(`/api/columns/${columnId}${boardParam(boardId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

export async function apiCreateCard(
  columnId: string,
  title: string,
  details: string,
  importance: Importance = "medium",
  dueDate?: string | null,
  boardId?: number,
): Promise<Card> {
  const res = await fetch(`/api/cards${boardParam(boardId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ columnId, title, details, importance, dueDate }),
  });
  if (!res.ok) throw new Error("Failed to create card");
  return res.json();
}

export async function apiUpdateCard(
  cardId: string,
  title: string,
  details: string,
  importance: Importance = "medium",
  dueDate?: string | null,
  boardId?: number,
): Promise<void> {
  await fetch(`/api/cards/${cardId}${boardParam(boardId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, details, importance, dueDate }),
  });
}

export async function apiDeleteCard(cardId: string, boardId?: number): Promise<void> {
  await fetch(`/api/cards/${cardId}${boardParam(boardId)}`, { method: "DELETE" });
}

export async function apiMoveCard(cardId: string, columnId: string, position: number, boardId?: number): Promise<void> {
  await fetch(`/api/cards/${cardId}/move${boardParam(boardId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ columnId, position }),
  });
}
