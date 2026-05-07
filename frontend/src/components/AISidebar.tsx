"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { BoardData } from "@/lib/kanban";
import { sendChat, type ChatMessage } from "@/lib/chat";

type AISidebarProps = {
  boardId?: number;
  onBoardUpdate: (board: BoardData) => void;
};

export const AISidebar = ({ boardId, onBoardUpdate }: AISidebarProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const result = await sendChat(next, boardId);
      setMessages([...next, { role: "assistant", content: result.response }]);
      if (result.board_update) {
        onBoardUpdate(result.board);
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div className="flex w-80 flex-col overflow-hidden rounded-3xl border border-[var(--stroke)] bg-white/95 shadow-[0_8px_40px_rgba(0,0,0,0.14)] backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--stroke)] px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
                AI Assistant
              </p>
              <h2 className="mt-0.5 font-display text-base font-semibold text-[var(--navy-dark)]">
                Board Chat
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--gray-text)] transition hover:bg-[var(--surface)] hover:text-[var(--navy-dark)]"
              aria-label="Close chat"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex max-h-72 flex-col gap-2.5 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-center text-xs leading-5 text-[var(--gray-text)]">
                Ask me to add, move, or remove cards — e.g. &ldquo;Add a card called Deploy to Done.&rdquo;
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={
                  msg.role === "user"
                    ? "self-end max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--primary-blue)] px-3.5 py-2 text-sm leading-5 text-white"
                    : "self-start max-w-[85%] rounded-2xl rounded-bl-sm border border-[var(--stroke)] bg-[var(--surface)] px-3.5 py-2 text-sm leading-5 text-[var(--navy-dark)]"
                }
              >
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="self-start flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-[var(--stroke)] bg-[var(--surface)] px-3.5 py-2.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--gray-text)] [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--gray-text)] [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--gray-text)] [animation-delay:300ms]" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-[var(--stroke)] p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the AI..."
                disabled={loading}
                className="flex-1 rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FAB toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI chat" : "Open AI chat"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--secondary-purple)] shadow-[0_4px_20px_rgba(117,57,145,0.45)] transition hover:brightness-110 active:scale-95"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 4l12 12M16 4L4 16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M4 6h14M4 11h10M4 16h7" stroke="white" strokeWidth="1.75" strokeLinecap="round"/>
            <circle cx="18" cy="16" r="3.5" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="1.25"/>
            <path d="M17 16h2M18 15v2" stroke="white" strokeWidth="1.25" strokeLinecap="round"/>
          </svg>
        )}
      </button>
    </div>
  );
};
