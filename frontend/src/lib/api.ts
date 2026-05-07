import type { BoardData, BoardSummary, Card, ChecklistItem, Comment, Importance, Label } from "./kanban";

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

export async function apiCreateColumn(title: string, boardId?: number): Promise<{ id: string; title: string; cardIds: string[] }> {
  const res = await fetch(`/api/columns${boardParam(boardId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to create column");
  return res.json();
}

export async function apiRenameColumn(columnId: string, title: string, boardId?: number): Promise<void> {
  await fetch(`/api/columns/${columnId}${boardParam(boardId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

export async function apiDeleteColumn(columnId: string, boardId?: number): Promise<void> {
  const res = await fetch(`/api/columns/${columnId}${boardParam(boardId)}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? "Failed to delete column");
  }
}

export async function apiCreateLabel(name: string, color: string, boardId?: number): Promise<Label> {
  const res = await fetch(`/api/labels${boardParam(boardId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) throw new Error("Failed to create label");
  return res.json();
}

export async function apiUpdateLabel(labelId: string, name: string, color: string, boardId?: number): Promise<void> {
  await fetch(`/api/labels/${labelId}${boardParam(boardId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
}

export async function apiDeleteLabel(labelId: string, boardId?: number): Promise<void> {
  await fetch(`/api/labels/${labelId}${boardParam(boardId)}`, { method: "DELETE" });
}

export async function apiCreateCard(
  columnId: string,
  title: string,
  details: string,
  importance: Importance = "medium",
  dueDate?: string | null,
  labelIds?: string[],
  boardId?: number,
  storyPoints?: number | null,
  assignee?: string | null,
): Promise<Card> {
  const res = await fetch(`/api/cards${boardParam(boardId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ columnId, title, details, importance, dueDate, labelIds: labelIds ?? [], storyPoints, assignee }),
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
  labelIds?: string[] | null,
  boardId?: number,
  storyPoints?: number | null,
  assignee?: string | null,
): Promise<void> {
  await fetch(`/api/cards/${cardId}${boardParam(boardId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, details, importance, dueDate, labelIds, storyPoints, assignee }),
  });
}

export async function apiListComments(cardId: string, boardId?: number): Promise<Comment[]> {
  const res = await fetch(`/api/cards/${cardId}/comments${boardParam(boardId)}`);
  if (!res.ok) throw new Error("Failed to fetch comments");
  return res.json();
}

export async function apiCreateComment(cardId: string, text: string, boardId?: number): Promise<Comment> {
  const res = await fetch(`/api/cards/${cardId}/comments${boardParam(boardId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Failed to create comment");
  return res.json();
}

export async function apiDeleteComment(cardId: string, commentId: string, boardId?: number): Promise<void> {
  await fetch(`/api/cards/${cardId}/comments/${commentId}${boardParam(boardId)}`, { method: "DELETE" });
}

export async function apiAddChecklistItem(cardId: string, text: string, boardId?: number): Promise<ChecklistItem> {
  const res = await fetch(`/api/cards/${cardId}/checklist${boardParam(boardId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Failed to add checklist item");
  return res.json();
}

export async function apiUpdateChecklistItem(
  cardId: string,
  itemId: string,
  text: string,
  checked: boolean,
  boardId?: number,
): Promise<void> {
  await fetch(`/api/cards/${cardId}/checklist/${itemId}${boardParam(boardId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, checked }),
  });
}

export async function apiDeleteChecklistItem(cardId: string, itemId: string, boardId?: number): Promise<void> {
  await fetch(`/api/cards/${cardId}/checklist/${itemId}${boardParam(boardId)}`, { method: "DELETE" });
}

export async function apiSetWipLimit(columnId: string, wipLimit: number | null, boardId?: number): Promise<void> {
  await fetch(`/api/columns/${columnId}/wip-limit${boardParam(boardId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wipLimit }),
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
