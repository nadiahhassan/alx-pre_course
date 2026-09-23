"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field } from "@/components/ui";
import { AUDIENCE_LABELS, AUDIENCES, DIRECTIONS, FREQUENCIES, LEVEL_LABELS, LEVELS, MEASURE_TYPE_LABELS, MEASURE_TYPES } from "@/lib/constants";
import { fieldDefault, formKey, type FormState } from "@/lib/forms";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export interface ParameterDefaults {
  name?: string;
  definition?: string;
  level?: string;
  unit?: string;
  direction?: string;
  measureType?: string;
  frequency?: string;
  dataSource?: string;
  baseline?: number;
  target?: number;
  targetDate?: string;
  isKey?: boolean;
  audience?: string;
  leadingIndicatorForId?: string | null;
  libraryItemId?: string | null;
}

/**
 * Used for both project parameters and library definitions. Library
 * definitions have no baseline, target or project links (`mode="library"`).
 */
export function ParameterForm({
  action,
  defaults = {},
  mode,
  otherParameters = [],
  cancelHref,
  submitLabel,
  libraryName,
}: {
  action: Action;
  defaults?: ParameterDefaults;
  mode: "project" | "library";
  otherParameters?: { id: string; name: string }[];
  cancelHref: string;
  submitLabel: string;
  libraryName?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.errors ?? {};
  const d = (name: keyof ParameterDefaults, fallback?: string | number) =>
    fieldDefault(state, name, (defaults[name] as string | number | null | undefined) ?? fallback);

  return (
    <form key={formKey(state)} action={formAction} className="card max-w-3xl space-y-5 p-5">
      {libraryName && (
        <p className="rounded-md bg-surface-2 px-3 py-2 text-sm text-ink-2">
          Based on library definition <strong className="text-ink">{libraryName}</strong>. Changes here apply to this project only.
        </p>
      )}
      <input type="hidden" name="libraryItemId" value={d("libraryItemId")} />

      <Field label="Name" name="name" error={e.name}>
        <input id="name" name="name" className="input" defaultValue={d("name")} required />
      </Field>
      <Field label="Definition" name="definition" error={e.definition} hint="Exactly what is counted, so everyone measures it the same way.">
        <textarea id="definition" name="definition" rows={2} className="input" defaultValue={d("definition")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Logic-model level" name="level" error={e.level}>
          <select id="level" name="level" className="input" defaultValue={d("level", "output")}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABELS[l].replace(/s$/, "")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unit" name="unit" error={e.unit} hint="e.g. people, %, £, score (1-10)">
          <input id="unit" name="unit" className="input" defaultValue={d("unit")} />
        </Field>
        <Field label="Update frequency" name="frequency">
          <select id="frequency" name="frequency" className="input" defaultValue={d("frequency", "monthly")}>
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f[0].toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Good direction" name="direction">
          <select id="direction" name="direction" className="input" defaultValue={d("direction", "increase")}>
            {DIRECTIONS.map((d) => (
              <option key={d} value={d}>
                {d === "increase" ? "Higher is better" : "Lower is better"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="How entries combine" name="measureType">
          <select id="measureType" name="measureType" className="input" defaultValue={d("measureType", "point")}>
            {MEASURE_TYPES.map((m) => (
              <option key={m} value={m}>
                {MEASURE_TYPE_LABELS[m]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Data source" name="dataSource" hint="Where the numbers come from, e.g. attendance registers, web analytics.">
        <input id="dataSource" name="dataSource" className="input" defaultValue={d("dataSource")} />
      </Field>

      {mode === "project" && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Baseline" name="baseline" error={e.baseline} hint="Value at project start">
              <input id="baseline" name="baseline" inputMode="decimal" className="input" defaultValue={d("baseline", 0)} />
            </Field>
            <Field label="Target" name="target" error={e.target}>
              <input id="target" name="target" inputMode="decimal" className="input" defaultValue={d("target")} required />
            </Field>
            <Field label="Target date" name="targetDate" error={e.targetDate} hint="Defaults to the project end date">
              <input id="targetDate" name="targetDate" type="date" className="input" defaultValue={d("targetDate")} />
            </Field>
          </div>

          <Field label="Audience" name="audience" hint="Who this metric is about: people inside the organisation, outside it, or both.">
            <select id="audience" name="audience" className="input" defaultValue={d("audience", "external")}>
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>
                  {AUDIENCE_LABELS[a]}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Leading indicator for"
            name="leadingIndicatorForId"
            error={e.leadingIndicatorForId}
            hint="If this metric falls behind, the linked metric is flagged as at risk."
          >
            <select
              id="leadingIndicatorForId"
              name="leadingIndicatorForId"
              className="input"
              defaultValue={d("leadingIndicatorForId")}
            >
              <option value="">None</option>
              {otherParameters.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isKey" defaultChecked={state.values ? state.values.isKey === "on" : defaults.isKey} className="size-4 accent-[var(--accent)]" />
            Key metric (shown on the portfolio view and used for the project's overall status)
          </label>
        </>
      )}

      <div className="flex items-center gap-3 border-t border-line pt-4">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className="btn-ghost">
          Cancel
        </Link>
        {Object.keys(e).length > 0 && <span className="text-sm text-critical-ink">Please fix the highlighted fields.</span>}
      </div>
    </form>
  );
}
