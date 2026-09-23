// Everything a dashboard needs, as plain JSON. The live dashboard, snapshots
// (stored frozen in the database) and share pages all render from this shape.

import type { Campaign, CampaignMetric, Entry, Evidence, Parameter, Project } from "@prisma/client";
import { summarizeCampaign, type CampaignSummary } from "./campaigns";
import { buildDashboard, type ProjectDashboard } from "./dashboard";
import { isStakeholderVisible } from "./visibility";
import { matchesAudience, type AudienceFilter } from "./audience";
import { countStatuses, overallRag } from "./status";

export const PAYLOAD_VERSION = 1;

export interface CampaignView extends CampaignSummary {
  id: string;
  name: string;
  channel: string;
  startDate: string;
  endDate: string | null;
  spend: number;
  trackingTag: string;
  notes: string;
  audience: string;
}

export interface EvidenceView {
  id: string;
  type: string;
  title: string;
  body: string;
  source: string;
  url: string;
  date: string;
  parameterId: string | null;
  tags: string[];
  origin: string;
  approved: boolean;
}

export interface DashboardPayload {
  version: number;
  dashboard: ProjectDashboard;
  toc: { inputs: string; activities: string; outputs: string; outcomes: string; impact: string };
  campaigns: CampaignView[];
  evidence: EvidenceView[];
  /** True when unapproved AI-generated items have been left out. */
  stakeholderSafe: boolean;
}

export interface PayloadSource {
  project: Project;
  parameters: (Parameter & { entries: Entry[] })[];
  campaigns: (Campaign & { metrics: CampaignMetric[] })[];
  evidence: Evidence[];
}

/**
 * Build the payload as of a date. Entries, campaigns, campaign metrics and
 * evidence after `asOf` are left out, so a snapshot shows only what was
 * known at the time. With `stakeholderSafe`, unapproved AI items are dropped.
 */
export function buildPayload(src: PayloadSource, asOf: Date, opts: { stakeholderSafe: boolean }): DashboardPayload {
  const t = asOf.getTime();
  const campaigns: CampaignView[] = src.campaigns
    .filter((c) => c.startDate.getTime() <= t)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .map((c) => {
      const metrics = c.metrics.filter((m) => m.date.getTime() <= t);
      return {
        id: c.id,
        name: c.name,
        channel: c.channel,
        startDate: c.startDate.toISOString(),
        endDate: c.endDate?.toISOString() ?? null,
        spend: c.spend,
        trackingTag: c.trackingTag,
        notes: c.notes,
        audience: c.audience,
        ...summarizeCampaign(c.spend, metrics),
      };
    });

  const evidence: EvidenceView[] = src.evidence
    .filter((e) => e.date.getTime() <= t)
    .filter((e) => !opts.stakeholderSafe || isStakeholderVisible(e))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      body: e.body,
      source: e.source,
      url: e.url,
      date: e.date.toISOString(),
      parameterId: e.parameterId,
      tags: e.tags ? e.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
      origin: e.origin,
      approved: e.approvedAt !== null,
    }));

  const p = src.project;
  return {
    version: PAYLOAD_VERSION,
    dashboard: buildDashboard(p, src.parameters, asOf),
    toc: { inputs: p.tocInputs, activities: p.tocActivities, outputs: p.tocOutputs, outcomes: p.tocOutcomes, impact: p.tocImpact },
    campaigns,
    evidence,
    stakeholderSafe: opts.stakeholderSafe,
  };
}

/**
 * Narrow a payload to one audience: metrics and campaigns tagged for it (or
 * "both"), and evidence attached to those metrics or to the whole initiative.
 * Status counts are recalculated for what remains.
 */
export function filterPayload(payload: DashboardPayload, audience: AudienceFilter): DashboardPayload {
  if (audience === "all") return payload;
  // Snapshots frozen before audiences existed have no tag; treat them as external.
  const tag = (x: { audience?: string }) => x.audience ?? "external";
  const metrics = payload.dashboard.metrics.filter((m) => matchesAudience(tag(m), audience));
  const ids = new Set(metrics.map((m) => m.id));
  const key = metrics.filter((m) => m.isKey).map((m) => m.status);
  const all = metrics.map((m) => m.status);
  return {
    ...payload,
    dashboard: { ...payload.dashboard, metrics, counts: countStatuses(all), overall: overallRag(key.length ? key : all) },
    campaigns: payload.campaigns.filter((c) => matchesAudience(tag(c), audience)),
    evidence: payload.evidence.filter((e) => !e.parameterId || ids.has(e.parameterId)),
  };
}
