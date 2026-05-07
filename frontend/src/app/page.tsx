"use client";

import { useEffect, useState } from "react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LoginPage } from "@/components/LoginPage";
import { getMe, type User } from "@/lib/auth";

export default function Home() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    getMe().then(setUser);
  }, []);

  if (user === undefined) return null;
  if (!user) return <LoginPage onLogin={(u) => setUser(u)} />;
  return <KanbanBoard user={user} onLogout={() => setUser(null)} />;
}
