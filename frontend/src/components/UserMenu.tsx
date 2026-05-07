"use client";

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import type { User } from "@/lib/auth";
import { logout, changePassword } from "@/lib/auth";

type UserMenuProps = {
  user: User;
  onLogout: () => void;
};

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (next.length < 6) { setError("New password must be at least 6 characters"); return; }
    const result = await changePassword(current, next);
    if (result.ok) { setSuccess(true); setTimeout(onClose, 1500); }
    else setError(result.error ?? "Failed to change password");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[320px] rounded-2xl border border-[var(--stroke)] bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.18)]" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 font-display text-base font-semibold text-[var(--navy-dark)]">Change password</h3>
        {success ? (
          <p className="text-sm text-green-600 font-medium">Password changed successfully!</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary-blue)]" required />
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password (min 6 chars)" className="w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary-blue)]" required />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" className="rounded-full bg-[var(--secondary-purple)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110">Save</button>
              <button type="button" onClick={onClose} className="rounded-full border border-[var(--stroke)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--gray-text)] transition hover:text-[var(--navy-dark)]">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export const UserMenu = ({ user, onLogout }: UserMenuProps) => {
  const [open, setOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          data-testid="user-menu-button"
          className="flex items-center gap-2 rounded-full border border-[var(--stroke)] px-3 py-1.5 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--navy-dark)] hover:text-[var(--navy-dark)]"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--secondary-purple)] text-[10px] font-bold text-white uppercase">
            {user.username[0]}
          </span>
          {user.username}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-2xl border border-[var(--stroke)] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--stroke)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">Signed in as</p>
              <p className="mt-0.5 text-sm font-semibold text-[var(--navy-dark)] truncate">{user.username}</p>
              {user.email && <p className="text-[10px] text-[var(--gray-text)] truncate">{user.email}</p>}
            </div>
            <div className="p-1">
              <button
                type="button"
                onClick={() => { setOpen(false); setChangingPassword(true); }}
                className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--navy-dark)] transition hover:bg-[var(--surface)]"
              >
                Change password
              </button>
              <button
                type="button"
                onClick={async () => { await logout(); onLogout(); }}
                data-testid="sign-out-button"
                className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-500 transition hover:bg-red-50"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
