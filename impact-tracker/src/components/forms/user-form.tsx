"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { User } from "@prisma/client";
import { Field } from "@/components/ui";
import { ROLE_LABELS, ROLES, TEAM_LABELS, TEAMS } from "@/lib/constants";
import { fieldDefault, formKey, type FormState } from "@/lib/forms";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

const ROLE_HELP: Record<string, string> = {
  admin: "Everything, including people, programme settings and budgets.",
  programme: "Edits initiatives, metrics, data, campaigns, evidence and snapshots.",
  partner: "Views everything, adds evidence and share links. Marketing also edits campaigns.",
  viewer: "Read-only.",
};

export function UserForm({ action, user }: { action: Action; user?: User }) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.errors ?? {};
  const [role, setRole] = useState(fieldDefault(state, "role", user?.role ?? "programme"));
  return (
    <form key={formKey(state)} action={formAction} className="card max-w-2xl space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" error={e.name}>
          <input id="name" name="name" className="input" defaultValue={fieldDefault(state, "name", user?.name)} required />
        </Field>
        <Field label="Email" name="email" error={e.email}>
          <input id="email" name="email" type="email" className="input" defaultValue={fieldDefault(state, "email", user?.email)} required />
        </Field>
        <Field label="Role" name="role" error={e.role} hint={ROLE_HELP[role]}>
          <select id="role" name="role" className="input" value={role} onChange={(ev) => setRole(ev.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </Field>
        {role === "partner" && (
          <Field label="Partner team" name="team" error={e.team}>
            <select id="team" name="team" className="input" defaultValue={fieldDefault(state, "team", user?.team || "comms")}>
              {TEAMS.map((t) => (
                <option key={t} value={t}>
                  {TEAM_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      <Field
        label={user ? "New password (optional)" : "Temporary password"}
        name="password"
        error={e.password}
        hint={user ? "Leave blank to keep their current password. Setting one signs them out everywhere." : "Share it with them securely; they can change it under Account."}
      >
        <input id="password" name="password" type="text" autoComplete="new-password" className="input" required={!user} />
      </Field>
      <div className="flex gap-3 border-t border-line pt-4">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : user ? "Save changes" : "Add person"}
        </button>
        <Link href="/people" className="btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}

export function PasswordForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.errors ?? {};
  return (
    <form key={formKey(state)} action={formAction} className="card max-w-md space-y-4 p-5">
      <h2 className="font-semibold">Change password</h2>
      <Field label="Current password" name="current" error={e.current}>
        <input id="current" name="current" type="password" autoComplete="current-password" className="input" required />
      </Field>
      <Field label="New password" name="next" error={e.next} hint="At least 10 characters. Other devices will be signed out.">
        <input id="next" name="next" type="password" autoComplete="new-password" className="input" required />
      </Field>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </button>
        {state.message && <span className="text-sm text-good-ink">{state.message}</span>}
      </div>
    </form>
  );
}
