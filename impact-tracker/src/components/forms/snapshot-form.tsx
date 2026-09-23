"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field } from "@/components/ui";
import { fieldDefault, formKey, type FormState } from "@/lib/forms";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function SnapshotForm({ action, defaultLabel, defaultDate, cancelHref }: { action: Action; defaultLabel: string; defaultDate: string; cancelHref: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.errors ?? {};
  return (
    <form key={formKey(state)} action={formAction} className="card max-w-xl space-y-4 p-5">
      <Field label="Label" name="label" error={e.label} hint="How people will refer to it, e.g. “Q3 2026 as reported to the board”.">
        <input id="label" name="label" className="input" defaultValue={fieldDefault(state, "label", defaultLabel)} required />
      </Field>
      <Field label="Data as of" name="asOfDate" error={e.asOfDate} hint="Entries, campaigns and evidence dated after this are left out.">
        <input id="asOfDate" name="asOfDate" type="date" className="input" defaultValue={fieldDefault(state, "asOfDate", defaultDate)} required />
      </Field>
      <p className="rounded-md bg-surface-2 px-3 py-2 text-xs text-ink-2">
        The snapshot stores a frozen copy of the dashboard. Later edits to entries or parameters won’t change it. AI-generated items that haven’t
        been approved are left out.
      </p>
      <div className="flex gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Freezing…" : "Freeze snapshot"}
        </button>
        <Link href={cancelHref} className="btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
