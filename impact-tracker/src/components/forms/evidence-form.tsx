"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Evidence } from "@prisma/client";
import { Field } from "@/components/ui";
import { EVIDENCE_TYPES } from "@/lib/constants";
import { toDateInput } from "@/lib/format";
import { fieldDefault, formKey, type FormState } from "@/lib/forms";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

const TYPE_LABELS: Record<string, string> = { quote: "Quote", survey: "Survey response or result", "case-study": "Case study", link: "Link" };

export function EvidenceForm({
  action,
  evidence,
  parameters,
  defaultParameterId,
  defaultDate,
  cancelHref,
  submitLabel,
}: {
  action: Action;
  evidence?: Evidence;
  parameters: { id: string; name: string }[];
  defaultParameterId?: string;
  defaultDate: string;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.errors ?? {};
  const d = (name: string, fallback: string | number | null | undefined) => fieldDefault(state, name, fallback);
  return (
    <form key={formKey(state)} action={formAction} className="card max-w-3xl space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Type" name="type">
          <select id="type" name="type" className="input" defaultValue={d("type", evidence?.type ?? "quote")}>
            {EVIDENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date" name="date" error={e.date}>
          <input id="date" name="date" type="date" className="input" defaultValue={d("date", evidence ? toDateInput(evidence.date) : defaultDate)} required />
        </Field>
        <Field label="Related metric" name="parameterId" error={e.parameterId} hint="Optional">
          <select id="parameterId" name="parameterId" className="input" defaultValue={d("parameterId", evidence?.parameterId ?? defaultParameterId)}>
            <option value="">Whole project</option>
            {parameters.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Title" name="title" error={e.title} hint="For quotes, who said it in a few words, e.g. “Editor on the analytics dashboard”">
        <input id="title" name="title" className="input" defaultValue={d("title", evidence?.title)} required />
      </Field>
      <Field label="Text" name="body" error={e.body} hint="The quote, survey result or story">
        <textarea id="body" name="body" rows={5} className="input" defaultValue={d("body", evidence?.body)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Source" name="source" hint="Who or where it came from. Check consent before naming people.">
          <input id="source" name="source" className="input" defaultValue={d("source", evidence?.source)} />
        </Field>
        <Field label="Link" name="url" error={e.url}>
          <input id="url" name="url" type="url" className="input" placeholder="https://" defaultValue={d("url", evidence?.url)} />
        </Field>
      </div>
      <Field label="Tags" name="tags" hint="Comma-separated, e.g. revenue, membership">
        <input id="tags" name="tags" className="input" defaultValue={d("tags", evidence?.tags)} />
      </Field>
      <div className="flex items-center gap-3 border-t border-line pt-4">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className="btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
