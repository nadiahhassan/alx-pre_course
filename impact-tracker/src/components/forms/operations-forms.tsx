"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Decision, Responsibility, Risk, SpendEntry } from "@prisma/client";
import { Field } from "@/components/ui";
import {
  OWNER_TEAM_LABELS, OWNER_TEAMS, RECURRENCES, RESPONSIBILITY_STATUSES, RESPONSIBILITY_TYPE_LABELS, RESPONSIBILITY_TYPES,
  RISK_STATUSES, SPEND_CATEGORIES, SPEND_CATEGORY_LABELS,
} from "@/lib/constants";
import { toDateInput } from "@/lib/format";
import { fieldDefault, formKey, type FormState } from "@/lib/forms";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;
type Option = { id: string; name: string };

const cap = (s: string) => s[0].toUpperCase() + s.slice(1).replace(/-/g, " ");

function useForm(action: Action) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.errors ?? {};
  const d = (n: string, v: string | number | null | undefined) => fieldDefault(state, n, v);
  return { state, formAction, pending, e, d };
}

function Actions({ pending, label, cancelHref }: { pending: boolean; label: string; cancelHref: string }) {
  return (
    <div className="flex gap-3 border-t border-line pt-4">
      <button className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : label}
      </button>
      <Link href={cancelHref} className="btn-ghost">
        Cancel
      </Link>
    </div>
  );
}

function Select({ name, value, options, empty }: { name: string; value: string; options: [string, string][]; empty?: string }) {
  return (
    <select id={name} name={name} className="input" defaultValue={value}>
      {empty !== undefined && <option value="">{empty}</option>}
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

/** Links an item to a focus area and/or an initiative. */
function LinkFields({ d, focusAreas, projects, fa, pr }: { d: (n: string, v: string | null | undefined) => string; focusAreas: Option[]; projects: Option[]; fa?: string | null; pr?: string | null }) {
  return (
    <>
      <Field label="Focus area" name="focusAreaId" hint="Optional">
        <Select name="focusAreaId" value={d("focusAreaId", fa)} options={focusAreas.map((f) => [f.id, f.name])} empty="Whole programme" />
      </Field>
      <Field label="Initiative" name="projectId" hint="Optional">
        <Select name="projectId" value={d("projectId", pr)} options={projects.map((p) => [p.id, p.name])} empty="None" />
      </Field>
    </>
  );
}

export function SpendForm({ action, spend, projects, currency, defaultDate }: { action: Action; spend?: SpendEntry; projects: Option[]; currency: string; defaultDate: string }) {
  const { state, formAction, pending, e, d } = useForm(action);
  return (
    <form key={formKey(state)} action={formAction} className="card max-w-3xl space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Initiative" name="projectId" error={e.projectId}>
          <Select name="projectId" value={d("projectId", spend?.projectId ?? projects[0]?.id)} options={projects.map((p) => [p.id, p.name])} />
        </Field>
        <Field label="Date" name="date" error={e.date}>
          <input id="date" name="date" type="date" className="input" defaultValue={d("date", spend ? toDateInput(spend.date) : defaultDate)} required />
        </Field>
        <Field label={`Amount (${currency})`} name="amount" error={e.amount}>
          <input id="amount" name="amount" inputMode="decimal" className="input" defaultValue={d("amount", spend?.amount)} required />
        </Field>
        <Field label="Status" name="status" hint="Committed = contracted or ordered, not yet paid">
          <Select name="status" value={d("status", spend?.status ?? "actual")} options={[["actual", "Paid (actual)"], ["committed", "Committed"]]} />
        </Field>
        <Field label="Category" name="category">
          <Select name="category" value={d("category", spend?.category ?? "other")} options={SPEND_CATEGORIES.map((c) => [c, SPEND_CATEGORY_LABELS[c]])} />
        </Field>
        <Field label="Reference" name="reference" hint="PO, invoice or finance ID">
          <input id="reference" name="reference" className="input" defaultValue={d("reference", spend?.reference)} />
        </Field>
      </div>
      <Field label="Description" name="description">
        <input id="description" name="description" className="input" defaultValue={d("description", spend?.description)} />
      </Field>
      <Actions pending={pending} label={spend ? "Save changes" : "Add spend"} cancelHref="/operations/budget" />
    </form>
  );
}

export function ResponsibilityForm({
  action, item, users, focusAreas, projects, defaultDate,
}: { action: Action; item?: Responsibility; users: Option[]; focusAreas: Option[]; projects: Option[]; defaultDate: string }) {
  const { state, formAction, pending, e, d } = useForm(action);
  return (
    <form key={formKey(state)} action={formAction} className="card max-w-3xl space-y-4 p-5">
      <Field label="Title" name="title" error={e.title}>
        <input id="title" name="title" className="input" defaultValue={d("title", item?.title)} required />
      </Field>
      <Field label="Description" name="description">
        <textarea id="description" name="description" rows={2} className="input" defaultValue={d("description", item?.description)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Type" name="type">
          <Select name="type" value={d("type", item?.type ?? "admin")} options={RESPONSIBILITY_TYPES.map((t) => [t, RESPONSIBILITY_TYPE_LABELS[t]])} />
        </Field>
        <Field label="Team" name="team" hint="Partners can update items for their own team">
          <Select name="team" value={d("team", item?.team ?? "programme")} options={OWNER_TEAMS.map((t) => [t, OWNER_TEAM_LABELS[t]])} />
        </Field>
        <Field label="Owner" name="ownerId">
          <Select name="ownerId" value={d("ownerId", item?.ownerId)} options={users.map((u) => [u.id, u.name])} empty="Unassigned" />
        </Field>
        <Field label="Due date" name="dueDate" error={e.dueDate}>
          <input id="dueDate" name="dueDate" type="date" className="input" defaultValue={d("dueDate", item ? toDateInput(item.dueDate) : defaultDate)} required />
        </Field>
        <Field label="Repeats" name="recurrence" hint="Marking it done creates the next one">
          <Select name="recurrence" value={d("recurrence", item?.recurrence ?? "none")} options={RECURRENCES.map((r) => [r, r === "none" ? "Doesn't repeat" : cap(r)])} />
        </Field>
        <Field label="Status" name="status">
          <Select name="status" value={d("status", item?.status ?? "open")} options={RESPONSIBILITY_STATUSES.map((s) => [s, cap(s)])} />
        </Field>
        <LinkFields d={d} focusAreas={focusAreas} projects={projects} fa={item?.focusAreaId} pr={item?.projectId} />
      </div>
      <Field label="Notes" name="notes">
        <textarea id="notes" name="notes" rows={2} className="input" defaultValue={d("notes", item?.notes)} />
      </Field>
      <Actions pending={pending} label={item ? "Save changes" : "Add responsibility"} cancelHref="/operations/responsibilities" />
    </form>
  );
}

const SCALE = [1, 2, 3, 4, 5];
const LIKELIHOOD = ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"];
const IMPACT = ["Minor", "Moderate", "Significant", "Major", "Severe"];

export function RiskForm({ action, risk, users, focusAreas, projects }: { action: Action; risk?: Risk; users: Option[]; focusAreas: Option[]; projects: Option[] }) {
  const { state, formAction, pending, e, d } = useForm(action);
  return (
    <form key={formKey(state)} action={formAction} className="card max-w-3xl space-y-4 p-5">
      <Field label="Risk" name="title" error={e.title} hint="What might happen, e.g. “Partner newsrooms drop out before cohort 4”">
        <input id="title" name="title" className="input" defaultValue={d("title", risk?.title)} required />
      </Field>
      <Field label="Description" name="description">
        <textarea id="description" name="description" rows={2} className="input" defaultValue={d("description", risk?.description)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Likelihood" name="likelihood" error={e.likelihood}>
          <Select name="likelihood" value={d("likelihood", risk?.likelihood ?? 3)} options={SCALE.map((n) => [String(n), `${n} · ${LIKELIHOOD[n - 1]}`])} />
        </Field>
        <Field label="Impact" name="impact" error={e.impact}>
          <Select name="impact" value={d("impact", risk?.impact ?? 3)} options={SCALE.map((n) => [String(n), `${n} · ${IMPACT[n - 1]}`])} />
        </Field>
        <Field label="Status" name="status">
          <Select name="status" value={d("status", risk?.status ?? "open")} options={RISK_STATUSES.map((s) => [s, cap(s)])} />
        </Field>
        <Field label="Owner" name="ownerId">
          <Select name="ownerId" value={d("ownerId", risk?.ownerId)} options={users.map((u) => [u.id, u.name])} empty="Unassigned" />
        </Field>
        <Field label="Next review" name="reviewDate" error={e.reviewDate}>
          <input id="reviewDate" name="reviewDate" type="date" className="input" defaultValue={d("reviewDate", toDateInput(risk?.reviewDate))} />
        </Field>
        <div className="hidden sm:block" />
        <LinkFields d={d} focusAreas={focusAreas} projects={projects} fa={risk?.focusAreaId} pr={risk?.projectId} />
      </div>
      <Field label="Mitigation" name="mitigation" hint="What we're doing to reduce the likelihood or the impact">
        <textarea id="mitigation" name="mitigation" rows={3} className="input" defaultValue={d("mitigation", risk?.mitigation)} />
      </Field>
      <Actions pending={pending} label={risk ? "Save changes" : "Add risk"} cancelHref="/operations/risks" />
    </form>
  );
}

export function DecisionForm({ action, decision, focusAreas, projects, defaultDate }: { action: Action; decision?: Decision; focusAreas: Option[]; projects: Option[]; defaultDate: string }) {
  const { state, formAction, pending, e, d } = useForm(action);
  return (
    <form key={formKey(state)} action={formAction} className="card max-w-3xl space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field label="Title" name="title" error={e.title}>
          <input id="title" name="title" className="input" defaultValue={d("title", decision?.title)} required />
        </Field>
        <Field label="Date" name="date" error={e.date}>
          <input id="date" name="date" type="date" className="input" defaultValue={d("date", decision ? toDateInput(decision.date) : defaultDate)} required />
        </Field>
      </div>
      <Field label="Decision" name="decision" error={e.decision} hint="What was decided, in a sentence or two">
        <textarea id="decision" name="decision" rows={2} className="input" defaultValue={d("decision", decision?.decision)} required />
      </Field>
      <Field label="Why" name="rationale">
        <textarea id="rationale" name="rationale" rows={3} className="input" defaultValue={d("rationale", decision?.rationale)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Made by" name="madeBy" hint="Person or forum, e.g. Programme board">
          <input id="madeBy" name="madeBy" className="input" defaultValue={d("madeBy", decision?.madeBy)} />
        </Field>
        <LinkFields d={d} focusAreas={focusAreas} projects={projects} fa={decision?.focusAreaId} pr={decision?.projectId} />
      </div>
      <Actions pending={pending} label={decision ? "Save changes" : "Log decision"} cancelHref="/operations/decisions" />
    </form>
  );
}
