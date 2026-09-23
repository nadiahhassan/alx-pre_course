"use client";

import { useTransition } from "react";
import { setCurrentUser } from "@/server/user-actions";

export function UserPicker({ users, currentId }: { users: { id: string; name: string }[]; currentId: string }) {
  const [pending, start] = useTransition();
  if (!users.length) return null;
  return (
    <label className="flex items-center gap-2 text-sm text-ink-2">
      <span>Signed in as</span>
      <select
        className="rounded-md border border-line-strong bg-surface px-2 py-1 text-ink"
        defaultValue={currentId}
        disabled={pending}
        onChange={(e) => start(() => setCurrentUser(e.target.value))}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </label>
  );
}
