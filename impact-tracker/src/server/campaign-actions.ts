"use server";

import { requireAbility } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { normalizeMetricName } from "@/lib/campaigns";
import { AUDIENCES, CHANNELS } from "@/lib/constants";
import { parseCampaignCsv, type CampaignCsvRow } from "@/lib/csv";
import { FormReader, formValues, type FormState } from "@/lib/forms";

function readCampaign(fd: FormData) {
  const f = new FormReader(fd);
  const data = {
    name: f.text("name", { required: true, max: 200 }),
    channel: f.oneOf("channel", CHANNELS, "other"),
    startDate: f.date("startDate", { required: true }),
    endDate: f.date("endDate"),
    spend: f.number("spend", { min: 0 }) ?? 0,
    trackingTag: f.text("trackingTag", { max: 200 }),
    notes: f.text("notes", { max: 2000 }),
    audience: f.oneOf("audience", AUDIENCES, "external"),
  };
  if (data.startDate && data.endDate && data.endDate < data.startDate) f.errors.endDate = "End date must be on or after the start date";
  return { f, data };
}

function revalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}`, "layout");
}

export async function createCampaign(projectId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAbility("edit-campaigns");
  const { f, data } = readCampaign(fd);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  const c = await db.campaign.create({ data: { ...data, startDate: data.startDate!, projectId } });
  revalidate(projectId);
  redirect(`/projects/${projectId}/campaigns/${c.id}`);
}

export async function updateCampaign(projectId: string, campaignId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAbility("edit-campaigns");
  const { f, data } = readCampaign(fd);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.campaign.update({ where: { id: campaignId, projectId }, data: { ...data, startDate: data.startDate! } });
  revalidate(projectId);
  return { message: "Saved", values: formValues(fd) };
}

export async function deleteCampaign(projectId: string, campaignId: string) {
  await requireAbility("edit-campaigns");
  await db.campaign.delete({ where: { id: campaignId, projectId } });
  revalidate(projectId);
  redirect(`/projects/${projectId}/campaigns`);
}

/** Add or replace one metric value; an empty value deletes it. */
export async function saveCampaignMetric(projectId: string, campaignId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAbility("edit-campaigns");
  const f = new FormReader(fd);
  const date = f.date("date", { required: true });
  const metric = normalizeMetricName(f.text("metric", { required: true, max: 60 }));
  const value = f.number("value");
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.projectId !== projectId) return { errors: { metric: "Campaign not found" } };
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  const where = { campaignId_date_metric: { campaignId, date: date!, metric } };
  if (value === null) {
    await db.campaignMetric.deleteMany({ where: { campaignId, date: date!, metric } });
  } else {
    await db.campaignMetric.upsert({ where, create: { campaignId, date: date!, metric, value }, update: { value } });
  }
  revalidate(projectId);
  const { value: _v, ...keep } = formValues(fd);
  return { message: value === null ? "Removed" : "Saved", values: keep };
}

export interface CampaignImportResult {
  error: string | null;
  rows: CampaignCsvRow[];
  written?: number;
}

export async function importCampaignCsv(projectId: string, text: string, commit: boolean): Promise<CampaignImportResult> {
  await requireAbility("edit-campaigns");
  const campaigns = await db.campaign.findMany({ where: { projectId }, select: { id: true, name: true, trackingTag: true } });
  const parsed = parseCampaignCsv(text, campaigns);
  if (parsed.error || !commit) return parsed;
  const valid = parsed.rows.filter((r) => !r.error);
  await db.$transaction(
    valid.map((r) =>
      db.campaignMetric.upsert({
        where: { campaignId_date_metric: { campaignId: r.campaignId!, date: new Date(r.date!), metric: r.metric } },
        create: { campaignId: r.campaignId!, date: new Date(r.date!), metric: r.metric, value: r.value! },
        update: { value: r.value! },
      }),
    ),
  );
  revalidate(projectId);
  return { ...parsed, written: valid.length };
}
