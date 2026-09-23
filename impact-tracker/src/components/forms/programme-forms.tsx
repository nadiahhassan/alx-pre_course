"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FocusArea, Programme } from "@prisma/client";
import { Field } from "@/components/ui";
import { toDateInput } from "@/lib/format";
import { fieldDefault, formKey, type FormState } from "@/lib/forms";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function ProgrammeForm({ action, programme }: { action: Action; programme: Programme }) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.errors ?? {};
  const d = (n: string, v: string | number | null | undefined) => fieldDefault(state, n, v);
  return (
    <form key={formKey(state)} action={formAction} className="card max-w-3xl space-y-4 p-5">
      <Field label="Programme name" name="name" error={e.name}>
        <input id="name" name="name" className="input" defaultValue={d("name", programme.name)} required />
      </Field>
      <Field label="Mission" name="mission" hint="One or two sentences on the change the programme exists to create.">
        <textarea id="mission" name="mission" rows={2} className="input" defaultValue={d("mission", programme.mission)} />
      </Field>
      <Field label="Description" name="description">
        <textarea id="description" name="description" rows={3} className="input" defaultValue={d("description", programme.description)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Budget" name="budget" error={e.budget}>
          <input id="budget" name="budget" inputMode="decimal" className="input" defaultValue={d("budget", programme.budget)} required />
        </Field>
        <Field label="Currency" name="currency">
          <select id="currency" name="currency" className="input" defaultValue={d("currency", programme.currency)}>
            {["USD", "GBP", "EUR"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Start" name="startDate" error={e.startDate}>
          <input id="startDate" name="startDate" type="date" className="input" defaultValue={d("startDate", toDateInput(programme.startDate))} required />
        </Field>
        <Field label="End" name="endDate" error={e.endDate}>
          <input id="endDate" name="endDate" type="date" className="input" defaultValue={d("endDate", toDateInput(programme.endDate))} required />
        </Field>
      </div>
      <div className="flex items-center gap-3 border-t border-line pt-4">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save programme"}
        </button>
        {state.message && <span className="text-sm text-good-ink">{state.message}</span>}
      </div>
    </form>
  );
}

export function FocusAreaForm({
  action,
  focusArea,
  users,
  currencySymbol,
  cancelHref,
}: {
  action: Action;
  focusArea?: FocusArea;
  users: { id: string; name: string }[];
  currencySymbol: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.errors ?? {};
  const d = (n: string, v: string | number | null | undefined) => fieldDefault(state, n, v);
  return (
    <form key={formKey(state)} action={formAction} className="card max-w-2xl space-y-4 p-5">
      <Field label="Name" name="name" error={e.name} hint="e.g. Trainings, Product partnerships, Research">
        <input id="name" name="name" className="input" defaultValue={d("name", focusArea?.name)} required />
      </Field>
      <Field label="Description" name="description">
        <textarea id="description" name="description" rows={3} className="input" defaultValue={d("description", focusArea?.description)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Owner" name="ownerId">
          <select id="ownerId" name="ownerId" className="input" defaultValue={d("ownerId", focusArea?.ownerId)}>
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Budget allocation (${currencySymbol})`} name="budget" error={e.budget} hint="Share of the programme budget">
          <input id="budget" name="budget" inputMode="decimal" className="input" defaultValue={d("budget", focusArea?.budget ?? 0)} />
        </Field>
      </div>
      <div className="flex gap-3 border-t border-line pt-4">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : focusArea ? "Save changes" : "Create focus area"}
        </button>
        <Link href={cancelHref} className="btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
