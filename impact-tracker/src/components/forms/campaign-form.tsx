"use client";

import { useActionState } from "react";
import type { Campaign } from "@prisma/client";
import { Field } from "@/components/ui";
import { CHANNEL_LABELS, CHANNELS } from "@/lib/constants";
import { toDateInput } from "@/lib/format";
import { fieldDefault, formKey, type FormState } from "@/lib/forms";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function CampaignForm({ action, campaign, submitLabel }: { action: Action; campaign?: Campaign; submitLabel: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.errors ?? {};
  const d = (name: string, fallback: string | number | null | undefined) => fieldDefault(state, name, fallback);
  return (
    <form key={formKey(state)} action={formAction} className="card space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field label="Name" name="name" error={e.name}>
          <input id="name" name="name" className="input" defaultValue={d("name", campaign?.name)} required />
        </Field>
        <Field label="Channel" name="channel" error={e.channel}>
          <select id="channel" name="channel" className="input" defaultValue={d("channel", campaign?.channel ?? "social")}>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Start date" name="startDate" error={e.startDate}>
          <input id="startDate" name="startDate" type="date" className="input" defaultValue={d("startDate", toDateInput(campaign?.startDate))} required />
        </Field>
        <Field label="End date" name="endDate" error={e.endDate} hint="Leave blank if ongoing">
          <input id="endDate" name="endDate" type="date" className="input" defaultValue={d("endDate", toDateInput(campaign?.endDate))} />
        </Field>
        <Field label="Spend" name="spend" error={e.spend}>
          <input id="spend" name="spend" inputMode="decimal" className="input" defaultValue={d("spend", campaign?.spend ?? 0)} />
        </Field>
        <Field label="Tracking tag" name="trackingTag" hint="UTM campaign or other ID">
          <input id="trackingTag" name="trackingTag" className="input" defaultValue={d("trackingTag", campaign?.trackingTag)} />
        </Field>
      </div>
      <Field label="Notes" name="notes">
        <textarea id="notes" name="notes" rows={2} className="input" defaultValue={d("notes", campaign?.notes)} />
      </Field>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {state.message && <span className="text-sm text-good-ink">{state.message}</span>}
      </div>
    </form>
  );
}

export function CampaignMetricForm({ action, knownMetrics }: { action: Action; knownMetrics: string[] }) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.errors ?? {};
  return (
    <form key={formKey(state)} action={formAction} className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <Field label="Date" name="date" error={e.date}>
        <input id="date" name="date" type="date" className="input" defaultValue={fieldDefault(state, "date", "")} required />
      </Field>
      <Field label="Metric" name="metric" error={e.metric}>
        <input id="metric" name="metric" list="metric-names" className="input" placeholder="e.g. clicks" defaultValue={fieldDefault(state, "metric", "")} required />
        <datalist id="metric-names">
          {[...new Set([...knownMetrics, "impressions", "views", "clicks", "sign-ups", "opens", "attendees"])].map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </Field>
      <Field label="Value" name="value" error={e.value} hint="Blank removes the value">
        <input id="value" name="value" inputMode="decimal" className="input" />
      </Field>
      <div className="pt-6">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save value"}
        </button>
        {state.message && <span className="ml-2 text-sm text-good-ink">{state.message}</span>}
      </div>
    </form>
  );
}
