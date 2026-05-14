import type { BoardData } from "./kanban";
import { boardParam } from "./api";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResponse = {
  response: string;
  board_update: BoardData | null;
  board: BoardData;
};

export async function sendChat(messages: ChatMessage[], boardId?: number): Promise<ChatResponse> {
  const res = await fetch(`/api/ai/chat${boardParam(boardId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json();
}
