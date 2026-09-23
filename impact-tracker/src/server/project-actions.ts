"use server";

import { requireAbility } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PROJECT_STATUSES } from "@/lib/constants";
import { FormReader, formValues, type FormState } from "@/lib/forms";

function readProject(fd: FormData) {
  const f = new FormReader(fd);
  const data = {
    name: f.text("name", { required: true, max: 200 }),
    focusAreaId: f.text("focusAreaId") || null,
    description: f.text("description", { max: 5000 }),
    ownerId: f.text("ownerId") || null,
    startDate: f.date("startDate", { required: true }),
    endDate: f.date("endDate", { required: true }),
    budget: f.number("budget", { min: 0 }),
    currency: f.text("currency") || "GBP",
    region: f.text("region", { max: 200 }),
    status: f.oneOf("status", PROJECT_STATUSES, "planning"),
    tocInputs: f.text("tocInputs"),
    tocActivities: f.text("tocActivities"),
    tocOutputs: f.text("tocOutputs"),
    tocOutcomes: f.text("tocOutcomes"),
    tocImpact: f.text("tocImpact"),
  };
  if (data.startDate && data.endDate && data.endDate <= data.startDate) {
    f.errors.endDate = "End date must be after the start date";
  }
  return { f, data };
}

export async function createProject(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAbility("edit-data");
  const { f, data } = readProject(fd);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  const project = await db.project.create({ data: { ...data, startDate: data.startDate!, endDate: data.endDate! } });
  revalidatePath("/");
  redirect(`/projects/${project.id}/parameters`);
}

export async function updateProject(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAbility("edit-data");
  const { f, data } = readProject(fd);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.project.update({ where: { id }, data: { ...data, startDate: data.startDate!, endDate: data.endDate! } });
  revalidatePath("/");
  revalidatePath(`/projects/${id}`, "layout");
  return { message: "Saved", values: formValues(fd) };
}

export async function setProjectArchived(id: string, archived: boolean) {
  await requireAbility("edit-data");
  await db.project.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
  revalidatePath("/");
  revalidatePath(`/projects/${id}`, "layout");
}
