import type { BoardData, Card } from "./kanban";

export async function fetchBoard(): Promise<BoardData> {
  const res = await fetch("/api/board");
  if (!res.ok) throw new Error("Failed to fetch board");
  return res.json();
}

export async function apiRenameColumn(columnId: string, title: string): Promise<void> {
  await fetch(`/api/columns/${columnId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

export async function apiCreateCard(columnId: string, title: string, details: string): Promise<Card> {
  const res = await fetch("/api/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ columnId, title, details }),
  });
  return res.json();
}

export async function apiDeleteCard(cardId: string): Promise<void> {
  await fetch(`/api/cards/${cardId}`, { method: "DELETE" });
}

export async function apiMoveCard(cardId: string, columnId: string, position: number): Promise<void> {
  await fetch(`/api/cards/${cardId}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ columnId, position }),
  });
}
