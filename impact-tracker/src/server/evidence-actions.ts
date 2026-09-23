"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { EVIDENCE_TYPES } from "@/lib/constants";
import { getCurrentUser } from "@/lib/current-user";
import { FormReader, formValues, type FormState } from "@/lib/forms";

async function readEvidence(projectId: string, fd: FormData) {
  const f = new FormReader(fd);
  const data = {
    type: f.oneOf("type", EVIDENCE_TYPES, "quote"),
    title: f.text("title", { required: true, max: 200 }),
    body: f.text("body", { max: 10000 }),
    source: f.text("source", { max: 200 }),
    url: f.text("url", { max: 1000 }),
    date: f.date("date", { required: true }),
    parameterId: f.text("parameterId") || null,
    tags: f
      .text("tags", { max: 500 })
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .join(","),
  };
  if (data.url && !/^https?:\/\//i.test(data.url)) f.errors.url = "Links must start with http:// or https://";
  if (data.parameterId) {
    const p = await db.parameter.findUnique({ where: { id: data.parameterId } });
    if (!p || p.projectId !== projectId) f.errors.parameterId = "Choose a parameter in this project";
  }
  return { f, data };
}

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}`, "layout");
}

export async function createEvidence(projectId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { f, data } = await readEvidence(projectId, fd);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.evidence.create({ data: { ...data, date: data.date!, projectId } });
  revalidate(projectId);
  redirect(`/projects/${projectId}/evidence`);
}

export async function updateEvidence(projectId: string, evidenceId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { f, data } = await readEvidence(projectId, fd);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.evidence.update({ where: { id: evidenceId, projectId }, data: { ...data, date: data.date! } });
  revalidate(projectId);
  redirect(`/projects/${projectId}/evidence`);
}

export async function deleteEvidence(projectId: string, evidenceId: string) {
  await db.evidence.delete({ where: { id: evidenceId, projectId } });
  revalidate(projectId);
}

/** A person approves an AI-generated item so it can appear on stakeholder views. */
export async function setEvidenceApproved(projectId: string, evidenceId: string, approved: boolean) {
  const user = await getCurrentUser();
  await db.evidence.update({
    where: { id: evidenceId, projectId },
    data: approved ? { approvedAt: new Date(), approvedById: user?.id } : { approvedAt: null, approvedById: null },
  });
  revalidate(projectId);
}
