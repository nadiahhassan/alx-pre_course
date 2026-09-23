"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui";
import { CONFIDENCE } from "@/lib/constants";
import type { FormState } from "@/lib/forms";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function EntryForm({
  action,
  parameters,
  defaultDate,
}: {
  action: Action;
  parameters: { id: string; name: string; unit: string }[];
  defaultDate: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const e = state.errors ?? {};

  useEffect(() => {
    if (state.message) {
      form.current?.querySelector<HTMLInputElement>("[name=value]")?.focus();
      router.refresh(); // show the new value in the grid
    }
  }, [state, router]);

  return (
    <form ref={form} action={formAction} className="card space-y-4 p-4">
      <h2 className="font-semibold">Add a single entry</h2>
      <Field label="Parameter" name="parameterId" error={e.parameterId}>
        <select id="parameterId" name="parameterId" className="input" required>
          {parameters.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.unit && ` (${p.unit})`}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" name="date" error={e.date}>
          <input id="date" name="date" type="date" className="input" defaultValue={defaultDate} required />
        </Field>
        <Field label="Value" name="value" error={e.value}>
          <input id="value" name="value" inputMode="decimal" className="input" required />
        </Field>
      </div>
      <Field label="Confidence" name="confidence">
        <select id="confidence" name="confidence" className="input">
          {CONFIDENCE.map((c) => (
            <option key={c} value={c}>
              {c[0].toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Note" name="note">
        <textarea id="note" name="note" rows={2} className="input" placeholder="Optional context" />
      </Field>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save entry"}
        </button>
        {state.message && <span className="text-sm text-good-ink">{state.message}</span>}
      </div>
      <p className="text-xs text-muted">Replaces any existing value for the same parameter and date.</p>
    </form>
  );
}
