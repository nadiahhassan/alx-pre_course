"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { FormReader, formValues, type FormState } from "@/lib/forms";
import { today } from "@/lib/format";
import { getPayload } from "./queries";
import { VIEWS } from "@/lib/views";

/** End of the given UTC day, so entries dated that day are included. */
function endOfDay(d: Date) {
  return new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export async function createSnapshot(projectId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const f = new FormReader(fd);
  const label = f.text("label", { required: true, max: 120 });
  const asOfDate = f.date("asOfDate", { required: true });
  if (asOfDate && asOfDate > today()) f.errors.asOfDate = "Snapshots can't be dated in the future";
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };

  // Snapshots are for sharing, so unapproved AI-generated items are always left out.
  const payload = await getPayload(projectId, endOfDay(asOfDate!), true);
  const user = await getCurrentUser();
  const snapshot = await db.snapshot.create({
    data: { projectId, label, asOfDate: asOfDate!, payload: JSON.stringify(payload), createdById: user?.id },
  });
  revalidatePath(`/projects/${projectId}/snapshots`);
  redirect(`/projects/${projectId}/snapshots/${snapshot.id}`);
}

export async function deleteSnapshot(projectId: string, snapshotId: string) {
  await db.snapshot.delete({ where: { id: snapshotId, projectId } });
  revalidatePath(`/projects/${projectId}/snapshots`);
  redirect(`/projects/${projectId}/snapshots`);
}

export async function createShareLink(projectId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const f = new FormReader(fd);
  const view = f.oneOf("view", VIEWS, "leadership");
  const source = f.text("source") || "live";
  const label = f.text("label", { max: 120 });
  if (source !== "live") {
    const snap = await db.snapshot.findUnique({ where: { id: source } });
    if (!snap || snap.projectId !== projectId) f.errors.source = "Choose a snapshot from this project";
  }
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.shareLink.create({
    data: {
      projectId,
      snapshotId: source === "live" ? null : source,
      view,
      label,
      token: randomBytes(18).toString("base64url"),
    },
  });
  revalidatePath(`/projects/${projectId}/share`);
  return { message: "Link created" };
}

export async function revokeShareLink(projectId: string, linkId: string) {
  await db.shareLink.update({ where: { id: linkId, projectId }, data: { revokedAt: new Date() } });
  revalidatePath(`/projects/${projectId}/share`);
}
