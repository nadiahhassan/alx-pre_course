"use server";

import { requireAbility } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { CONFIDENCE, isOneOf } from "@/lib/constants";
import { parseEntriesCsv, type CsvRow } from "@/lib/csv";
import { FormReader, formValues, type FormState } from "@/lib/forms";

export interface CellEntry {
  id: string;
  value: number;
  confidence: string;
  note: string;
  loggedBy: string | null;
  updatedAt: string;
}

async function parameterInProject(projectId: string, parameterId: string) {
  const p = await db.parameter.findUnique({ where: { id: parameterId } });
  return p && p.projectId === projectId && !p.archivedAt ? p : null;
}

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}`, "layout");
  revalidatePath("/");
}

type SaveResult = { ok: true; entry: CellEntry | null } | { ok: false; error: string };

/** Save one grid cell. A null value deletes the entry. */
export async function saveCell(
  projectId: string,
  parameterId: string,
  dateIso: string,
  value: number | null,
  meta: { confidence?: string; note?: string } = {},
): Promise<SaveResult> {
  const user = await requireAbility("edit-data");
  if (!(await parameterInProject(projectId, parameterId))) return { ok: false, error: "Parameter not found in this project" };
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return { ok: false, error: "Invalid date" };
  const where = { parameterId_date: { parameterId, date } };

  if (value === null) {
    await db.entry.deleteMany({ where: { parameterId, date } });
    revalidate(projectId);
    return { ok: true, entry: null };
  }
  if (!Number.isFinite(value)) return { ok: false, error: "Enter a number" };
  if (meta.confidence !== undefined && !isOneOf(CONFIDENCE, meta.confidence)) {
    return { ok: false, error: "Unknown confidence level" };
  }

  const entry = await db.entry.upsert({
    where,
    create: {
      parameterId,
      date,
      value,
      confidence: meta.confidence ?? "measured",
      note: meta.note ?? "",
      loggedById: user.id,
    },
    update: {
      value,
      ...(meta.confidence !== undefined && { confidence: meta.confidence }),
      ...(meta.note !== undefined && { note: meta.note }),
      loggedById: user.id,
    },
    include: { loggedBy: true },
  });
  revalidate(projectId);
  return {
    ok: true,
    entry: {
      id: entry.id,
      value: entry.value,
      confidence: entry.confidence,
      note: entry.note,
      loggedBy: entry.loggedBy?.name ?? null,
      updatedAt: entry.updatedAt.toISOString(),
    },
  };
}

/** Single-entry form. Replaces any existing value for the same parameter and date. */
export async function createEntry(projectId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAbility("edit-data");
  const f = new FormReader(fd);
  const parameterId = f.text("parameterId", { required: true });
  const date = f.date("date", { required: true });
  const value = f.number("value", { required: true });
  const confidence = f.oneOf("confidence", CONFIDENCE, "measured");
  const note = f.text("note", { max: 2000 });
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  const result = await saveCell(projectId, parameterId, date!.toISOString(), value!, { confidence, note });
  if (!result.ok) return { errors: { value: result.error }, values: formValues(fd) };
  // Keep parameter, date and confidence for the next entry; clear value and note.
  const { value: _v, note: _n, ...keep } = formValues(fd);
  return { message: "Entry saved", values: keep };
}

export interface ImportPreview {
  format: string;
  error: string | null;
  rows: (CsvRow & { action: "create" | "update" | "skip" })[];
  created?: number;
  updated?: number;
}

/** Parse a CSV and, if `commit` is true, write the valid rows. Invalid rows are always skipped. */
export async function importEntriesCsv(
  projectId: string,
  text: string,
  defaultConfidence: string,
  commit: boolean,
): Promise<ImportPreview> {
  const user = await requireAbility("edit-data");
  const parameters = await db.parameter.findMany({
    where: { projectId, archivedAt: null },
    select: { id: true, name: true },
  });
  const conf = isOneOf(CONFIDENCE, defaultConfidence) ? defaultConfidence : "measured";
  const parsed = parseEntriesCsv(text, parameters, conf);
  if (parsed.error) return { format: parsed.format, error: parsed.error, rows: [] };

  // Later rows win when the same parameter and date appear twice.
  const seen = new Map<string, number>();
  parsed.rows.forEach((r, i) => {
    if (!r.error) seen.set(`${r.parameterId}|${r.date}`, i);
  });
  const rows = parsed.rows.map((r, i) =>
    !r.error && seen.get(`${r.parameterId}|${r.date}`) !== i ? { ...r, error: "Duplicate: a later row sets the same value" } : r,
  );

  const valid = rows.filter((r) => !r.error);
  const existing = await db.entry.findMany({
    where: { parameterId: { in: parameters.map((p) => p.id) } },
    select: { parameterId: true, date: true },
  });
  const existingKeys = new Set(existing.map((e) => `${e.parameterId}|${e.date.toISOString()}`));
  const withAction = rows.map((r) => ({
    ...r,
    action: r.error ? ("skip" as const) : existingKeys.has(`${r.parameterId}|${r.date}`) ? ("update" as const) : ("create" as const),
  }));

  if (!commit) return { format: parsed.format, error: null, rows: withAction };

  await db.$transaction(
    valid.map((r) =>
      db.entry.upsert({
        where: { parameterId_date: { parameterId: r.parameterId!, date: new Date(r.date!) } },
        create: {
          parameterId: r.parameterId!,
          date: new Date(r.date!),
          value: r.value!,
          confidence: r.confidence,
          note: r.note,
          loggedById: user.id,
        },
        update: {
          value: r.value!,
          confidence: r.confidence,
          ...(r.note && { note: r.note }),
          loggedById: user.id,
        },
      }),
    ),
  );
  revalidate(projectId);
  return {
    format: parsed.format,
    error: null,
    rows: withAction,
    created: withAction.filter((r) => r.action === "create").length,
    updated: withAction.filter((r) => r.action === "update").length,
  };
}
