"use client";

import { useTransition } from "react";
import { signOut } from "@/server/auth-actions";

export function SignOutButton() {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="rounded px-2 py-1 text-ink-2 hover:bg-surface-2 hover:text-ink" disabled={pending} onClick={() => start(() => signOut())}>
      Sign out
    </button>
  );
}
