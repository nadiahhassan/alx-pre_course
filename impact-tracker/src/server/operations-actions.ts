"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAbility, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  OWNER_TEAMS, RECURRENCES, RESPONSIBILITY_STATUSES, RESPONSIBILITY_TYPES, RISK_STATUSES, SPEND_CATEGORIES, SPEND_STATUSES,
} from "@/lib/constants";
import { parseSpendCsv, type SpendCsvRow } from "@/lib/csv";
import { FormReader, formValues, type FormState } from "@/lib/forms";
import { nextDueDate } from "@/lib/operations";
import { canUpdateResponsibility } from "@/lib/permissions";

function revalidate() {
  revalidatePath("/", "layout");
}

async function checkLinks(f: FormReader, focusAreaId: string | null, projectId: string | null) {
  if (focusAreaId && !(await db.focusArea.findUnique({ where: { id: focusAreaId } }))) f.errors.focusAreaId = "Choose a focus area";
  if (projectId && !(await db.project.findUnique({ where: { id: projectId } }))) f.errors.projectId = "Choose an initiative";
}

// Spend

function readSpend(fd: FormData) {
  const f = new FormReader(fd);
  const data = {
    projectId: f.text("projectId", { required: true }),
    date: f.date("date", { required: true }),
    amount: f.number("amount", { required: true }),
    category: f.oneOf("category", SPEND_CATEGORIES, "other"),
    status: f.oneOf("status", SPEND_STATUSES, "actual"),
    description: f.text("description", { max: 500 }),
    reference: f.text("reference", { max: 120 }),
  };
  return { f, data };
}

export async function createSpend(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAbility("edit-operations");
  const { f, data } = readSpend(fd);
  await checkLinks(f, null, data.projectId || null);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.spendEntry.create({ data: { ...data, date: data.date!, amount: data.amount!, createdById: user.id } });
  revalidate();
  redirect("/operations/budget");
}

export async function updateSpend(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAbility("edit-operations");
  const { f, data } = readSpend(fd);
  await checkLinks(f, null, data.projectId || null);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.spendEntry.update({ where: { id }, data: { ...data, date: data.date!, amount: data.amount! } });
  revalidate();
  redirect("/operations/budget");
}

export async function deleteSpend(id: string) {
  await requireAbility("edit-operations");
  await db.spendEntry.delete({ where: { id } });
  revalidate();
}

export interface SpendImportResult {
  error: string | null;
  rows: SpendCsvRow[];
  written?: number;
}

export async function importSpendCsv(text: string, commit: boolean): Promise<SpendImportResult> {
  const user = await requireAbility("edit-operations");
  const projects = await db.project.findMany({ where: { archivedAt: null }, select: { id: true, name: true } });
  const parsed = parseSpendCsv(text, projects, SPEND_CATEGORIES);
  if (parsed.error || !commit) return parsed;
  const valid = parsed.rows.filter((r) => !r.error);
  await db.spendEntry.createMany({
    data: valid.map((r) => ({
      projectId: r.projectId!, date: new Date(r.date!), amount: r.amount!, category: r.category, status: r.status,
      description: r.description, reference: r.reference, createdById: user.id,
    })),
  });
  revalidate();
  return { ...parsed, written: valid.length };
}

// Responsibilities

function readResponsibility(fd: FormData) {
  const f = new FormReader(fd);
  const data = {
    title: f.text("title", { required: true, max: 200 }),
    description: f.text("description", { max: 2000 }),
    type: f.oneOf("type", RESPONSIBILITY_TYPES, "admin"),
    team: f.oneOf("team", OWNER_TEAMS, "programme"),
    ownerId: f.text("ownerId") || null,
    focusAreaId: f.text("focusAreaId") || null,
    projectId: f.text("projectId") || null,
    dueDate: f.date("dueDate", { required: true }),
    recurrence: f.oneOf("recurrence", RECURRENCES, "none"),
    status: f.oneOf("status", RESPONSIBILITY_STATUSES, "open"),
    notes: f.text("notes", { max: 2000 }),
  };
  return { f, data };
}

export async function createResponsibility(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAbility("edit-operations");
  const { f, data } = readResponsibility(fd);
  await checkLinks(f, data.focusAreaId, data.projectId);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.responsibility.create({ data: { ...data, dueDate: data.dueDate!, completedAt: data.status === "done" ? new Date() : null } });
  revalidate();
  redirect("/operations/responsibilities");
}

export async function updateResponsibility(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAbility("edit-operations");
  const { f, data } = readResponsibility(fd);
  await checkLinks(f, data.focusAreaId, data.projectId);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  const before = await db.responsibility.findUniqueOrThrow({ where: { id } });
  await db.responsibility.update({ where: { id }, data: { ...data, dueDate: data.dueDate! } });
  if (before.status !== "done" && data.status === "done") await completeRecurring(id);
  revalidate();
  redirect("/operations/responsibilities");
}

/** Mark done and, for recurring items, create the next occurrence. */
async function completeRecurring(id: string) {
  const r = await db.responsibility.update({ where: { id }, data: { status: "done", completedAt: new Date() } });
  const next = nextDueDate(r.dueDate, r.recurrence);
  if (next) {
    const { id: _id, createdAt: _c, updatedAt: _u, completedAt: _d, ...rest } = r;
    await db.responsibility.create({ data: { ...rest, dueDate: next, status: "open", notes: "" } });
  }
  return next;
}

/** Quick status change from the list. Partners may update items assigned to their team. */
export async function setResponsibilityStatus(id: string, status: string): Promise<{ next: string | null }> {
  const user = await requireUser();
  const r = await db.responsibility.findUniqueOrThrow({ where: { id } });
  if (!canUpdateResponsibility(user, r.team)) throw new Error("You can only update responsibilities assigned to your team.");
  if (!(RESPONSIBILITY_STATUSES as readonly string[]).includes(status)) throw new Error("Unknown status");
  let next: Date | null = null;
  if (status === "done" && r.status !== "done") next = await completeRecurring(id);
  else await db.responsibility.update({ where: { id }, data: { status, completedAt: status === "done" ? r.completedAt ?? new Date() : null } });
  revalidate();
  return { next: next?.toISOString() ?? null };
}

export async function deleteResponsibility(id: string) {
  await requireAbility("edit-operations");
  await db.responsibility.delete({ where: { id } });
  revalidate();
}

// Risks

function readRisk(fd: FormData) {
  const f = new FormReader(fd);
  const data = {
    title: f.text("title", { required: true, max: 200 }),
    description: f.text("description", { max: 2000 }),
    likelihood: f.number("likelihood", { required: true }) ?? 3,
    impact: f.number("impact", { required: true }) ?? 3,
    mitigation: f.text("mitigation", { max: 2000 }),
    status: f.oneOf("status", RISK_STATUSES, "open"),
    ownerId: f.text("ownerId") || null,
    focusAreaId: f.text("focusAreaId") || null,
    projectId: f.text("projectId") || null,
    reviewDate: f.date("reviewDate"),
  };
  for (const k of ["likelihood", "impact"] as const) {
    if (!Number.isInteger(data[k]) || data[k] < 1 || data[k] > 5) f.errors[k] = "Choose 1 to 5";
  }
  return { f, data };
}

export async function createRisk(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAbility("edit-operations");
  const { f, data } = readRisk(fd);
  await checkLinks(f, data.focusAreaId, data.projectId);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.risk.create({ data });
  revalidate();
  redirect("/operations/risks");
}

export async function updateRisk(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAbility("edit-operations");
  const { f, data } = readRisk(fd);
  await checkLinks(f, data.focusAreaId, data.projectId);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.risk.update({ where: { id }, data });
  revalidate();
  redirect("/operations/risks");
}

export async function deleteRisk(id: string) {
  await requireAbility("edit-operations");
  await db.risk.delete({ where: { id } });
  revalidate();
}

// Decisions

function readDecision(fd: FormData) {
  const f = new FormReader(fd);
  const data = {
    date: f.date("date", { required: true }),
    title: f.text("title", { required: true, max: 200 }),
    decision: f.text("decision", { required: true, max: 4000 }),
    rationale: f.text("rationale", { max: 4000 }),
    madeBy: f.text("madeBy", { max: 200 }),
    focusAreaId: f.text("focusAreaId") || null,
    projectId: f.text("projectId") || null,
  };
  return { f, data };
}

export async function createDecision(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAbility("edit-operations");
  const { f, data } = readDecision(fd);
  await checkLinks(f, data.focusAreaId, data.projectId);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.decision.create({ data: { ...data, date: data.date! } });
  revalidate();
  redirect("/operations/decisions");
}

export async function updateDecision(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAbility("edit-operations");
  const { f, data } = readDecision(fd);
  await checkLinks(f, data.focusAreaId, data.projectId);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.decision.update({ where: { id }, data: { ...data, date: data.date! } });
  revalidate();
  redirect("/operations/decisions");
}

export async function deleteDecision(id: string) {
  await requireAbility("edit-operations");
  await db.decision.delete({ where: { id } });
  revalidate();
}
