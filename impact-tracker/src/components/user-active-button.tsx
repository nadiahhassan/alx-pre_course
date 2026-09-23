"use client";

import { useTransition } from "react";
import { setUserActive } from "@/server/auth-actions";

export function UserActiveButton({ userId, active }: { userId: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-ghost px-2 py-1"
      disabled={pending}
      onClick={() => (!active || confirm("Deactivate this account? They'll be signed out and can't sign in.")) && start(() => setUserActive(userId, !active))}
    >
      {active ? "Deactivate" : "Reactivate"}
    </button>
  );
}
