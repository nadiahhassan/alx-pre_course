"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui";
import { VIEW_BLURBS, VIEW_LABELS, VIEWS } from "@/lib/views";
import type { FormState } from "@/lib/forms";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function ShareForm({
  action,
  snapshots,
  defaultView,
  defaultSource,
}: {
  action: Action;
  snapshots: { id: string; label: string }[];
  defaultView: string;
  defaultSource: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.errors ?? {};
  return (
    <form action={formAction} className="card grid gap-4 p-5 md:grid-cols-3">
      <Field label="View" name="view" error={e.view}>
        <select id="view" name="view" className="input" defaultValue={defaultView}>
          {VIEWS.map((v) => (
            <option key={v} value={v}>
              {VIEW_LABELS[v]}: {VIEW_BLURBS[v]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Data" name="source" error={e.source} hint="A snapshot keeps figures fixed; live updates as data changes.">
        <select id="source" name="source" className="input" defaultValue={defaultSource}>
          <option value="live">Live dashboard</option>
          {snapshots.map((s) => (
            <option key={s.id} value={s.id}>
              Snapshot: {s.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Label (optional)" name="label" hint="Who it's for, e.g. “Board pack”">
        <input id="label" name="label" className="input" />
      </Field>
      <div className="flex items-center gap-3 md:col-span-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Creating…" : "Create read-only link"}
        </button>
        {state.message && <span className="text-sm text-good-ink">{state.message}</span>}
        <span className="text-xs text-muted">Anyone with the link can view it without signing in. You can revoke it at any time.</span>
      </div>
    </form>
  );
}
