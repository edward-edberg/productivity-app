"use client";

import { useEffect, useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginPage } from "@/components/LoginPage";
import { getMe } from "@/lib/auth";

export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    getMe().then((user) => setAuthed(user !== null));
  }, []);

  if (authed === null) return null;
  if (!authed) return <LoginPage onLogin={() => setAuthed(true)} />;
  return <KanbanBoard onLogout={() => setAuthed(false)} />;
}
