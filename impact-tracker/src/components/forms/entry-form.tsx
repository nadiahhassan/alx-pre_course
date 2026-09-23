"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui";
import { CONFIDENCE } from "@/lib/constants";
import { fieldDefault, formKey, type FormState } from "@/lib/forms";

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
    <form key={formKey(state)} ref={form} action={formAction} className="grid items-start gap-4 md:grid-cols-[2fr_1fr_1fr_1fr]">
      <Field label="Parameter" name="parameterId" error={e.parameterId}>
        <select id="parameterId" name="parameterId" className="input" defaultValue={fieldDefault(state, "parameterId", parameters[0]?.id)} required>
          {parameters.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.unit && ` (${p.unit})`}
            </option>
          ))}
        </select>
      </Field>
        <Field label="Date" name="date" error={e.date}>
          <input id="date" name="date" type="date" className="input" defaultValue={fieldDefault(state, "date", defaultDate)} required />
        </Field>
        <Field label="Value" name="value" error={e.value}>
          <input id="value" name="value" inputMode="decimal" className="input" defaultValue={fieldDefault(state, "value", "")} required />
        </Field>
      <Field label="Confidence" name="confidence">
        <select id="confidence" name="confidence" className="input" defaultValue={fieldDefault(state, "confidence", "measured")}>
          {CONFIDENCE.map((c) => (
            <option key={c} value={c}>
              {c[0].toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </Field>
      <div className="md:col-span-4">
      <Field label="Note" name="note">
        <textarea id="note" name="note" rows={2} className="input" placeholder="Optional context" defaultValue={fieldDefault(state, "note", "")} />
      </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3 md:col-span-4">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save entry"}
        </button>
        {state.message && <span className="text-sm text-good-ink">{state.message}</span>}
        <span className="text-xs text-muted">Replaces any existing value for the same parameter and date.</span>
      </div>
    </form>
  );
}
