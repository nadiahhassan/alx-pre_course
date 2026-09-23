"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAbility } from "@/lib/auth";
import { db } from "@/lib/db";
import { FormReader, formValues, type FormState } from "@/lib/forms";

export async function updateProgramme(programmeId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAbility("manage-programme");
  const f = new FormReader(fd);
  const data = {
    name: f.text("name", { required: true, max: 200 }),
    description: f.text("description", { max: 5000 }),
    mission: f.text("mission", { max: 2000 }),
    currency: f.text("currency") || "USD",
    budget: f.number("budget", { required: true, min: 0 }) ?? 0,
    startDate: f.date("startDate", { required: true }),
    endDate: f.date("endDate", { required: true }),
  };
  if (data.startDate && data.endDate && data.endDate <= data.startDate) f.errors.endDate = "End date must be after the start date";
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.programme.update({ where: { id: programmeId }, data: { ...data, startDate: data.startDate!, endDate: data.endDate! } });
  revalidatePath("/", "layout");
  return { message: "Saved", values: formValues(fd) };
}

function readFocusArea(fd: FormData) {
  const f = new FormReader(fd);
  const data = {
    name: f.text("name", { required: true, max: 120 }),
    description: f.text("description", { max: 2000 }),
    ownerId: f.text("ownerId") || null,
    budget: f.number("budget", { min: 0 }) ?? 0,
  };
  return { f, data };
}

export async function createFocusArea(programmeId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAbility("manage-programme");
  const { f, data } = readFocusArea(fd);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  const last = await db.focusArea.findFirst({ where: { programmeId }, orderBy: { sortOrder: "desc" } });
  const fa = await db.focusArea.create({ data: { ...data, programmeId, sortOrder: (last?.sortOrder ?? -1) + 1 } });
  revalidatePath("/", "layout");
  redirect(`/focus-areas/${fa.id}`);
}

export async function updateFocusArea(focusAreaId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAbility("manage-programme");
  const { f, data } = readFocusArea(fd);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.focusArea.update({ where: { id: focusAreaId }, data });
  revalidatePath("/", "layout");
  redirect(`/focus-areas/${focusAreaId}`);
}

export async function setFocusAreaArchived(focusAreaId: string, archived: boolean) {
  await requireAbility("manage-programme");
  await db.focusArea.update({ where: { id: focusAreaId }, data: { archivedAt: archived ? new Date() : null } });
  revalidatePath("/", "layout");
}
