"use client";

import { useActionState } from "react";
import type { Project } from "@prisma/client";
import { Field } from "@/components/ui";
import { PROJECT_STATUSES } from "@/lib/constants";
import { toDateInput } from "@/lib/format";
import type { FormState } from "@/lib/forms";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

const TOC = [
  { name: "tocInputs", label: "Inputs", hint: "Resources you put in: funding, staff, partners, tools." },
  { name: "tocActivities", label: "Activities", hint: "What the programme does with those inputs." },
  { name: "tocOutputs", label: "Outputs", hint: "Direct, countable products of the activities." },
  { name: "tocOutcomes", label: "Outcomes", hint: "Changes for participants that the outputs lead to." },
  { name: "tocImpact", label: "Impact", hint: "The long-term change you are ultimately contributing to." },
] as const;

export function ProjectForm({
  action,
  users,
  project,
  submitLabel,
}: {
  action: Action;
  users: { id: string; name: string }[];
  project?: Project;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-8">
      <section className="card space-y-4 p-5">
        <h2 className="font-semibold">Project details</h2>
        <Field label="Name" name="name" error={e.name}>
          <input id="name" name="name" className="input" defaultValue={project?.name} required />
        </Field>
        <Field label="Description" name="description" error={e.description}>
          <textarea id="description" name="description" rows={3} className="input" defaultValue={project?.description} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Owner" name="ownerId">
            <select id="ownerId" name="ownerId" className="input" defaultValue={project?.ownerId ?? ""}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" name="status" error={e.status}>
            <select id="status" name="status" className="input capitalize" defaultValue={project?.status ?? "planning"}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Region" name="region" error={e.region}>
            <input id="region" name="region" className="input" defaultValue={project?.region} />
          </Field>
          <Field label="Start date" name="startDate" error={e.startDate}>
            <input id="startDate" name="startDate" type="date" className="input" defaultValue={toDateInput(project?.startDate)} required />
          </Field>
          <Field label="End date" name="endDate" error={e.endDate}>
            <input id="endDate" name="endDate" type="date" className="input" defaultValue={toDateInput(project?.endDate)} required />
          </Field>
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <Field label="Budget" name="budget" error={e.budget}>
              <input id="budget" name="budget" inputMode="decimal" className="input" defaultValue={project?.budget ?? ""} />
            </Field>
            <Field label="Currency" name="currency">
              <select id="currency" name="currency" className="input" defaultValue={project?.currency ?? "GBP"}>
                {["GBP", "USD", "EUR"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Theory of change</h2>
          <p className="mt-1 text-sm text-ink-2">
            How the programme is expected to create change. Parameters you add later are grouped under these same levels.
          </p>
        </div>
        <ol className="space-y-4">
          {TOC.map((t, i) => (
            <li key={t.name} className="grid gap-2 sm:grid-cols-[10rem_1fr]">
              <div>
                <label htmlFor={t.name} className="text-sm font-medium">
                  {i + 1}. {t.label}
                </label>
                <p className="text-xs text-muted">{t.hint}</p>
              </div>
              <textarea id={t.name} name={t.name} rows={2} className="input" defaultValue={project?.[t.name]} />
            </li>
          ))}
        </ol>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {state.message && <span className="text-sm text-good-ink">{state.message}</span>}
        {Object.keys(e).length > 0 && <span className="text-sm text-critical-ink">Please fix the highlighted fields.</span>}
      </div>
    </form>
  );
}
