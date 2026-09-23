// Campaign roll-ups: totals per metric and a few derived ratios.

export interface CampaignMetricInput {
  date: Date | string;
  metric: string;
  value: number;
}

export interface CampaignSummary {
  totals: Record<string, number>;
  /** clicks / impressions */
  clickThroughRate: number | null;
  /** spend / sign-ups */
  costPerSignup: number | null;
  /** spend / clicks */
  costPerClick: number | null;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_]+/g, "-");

export function summarizeCampaign(spend: number, metrics: CampaignMetricInput[]): CampaignSummary {
  const totals: Record<string, number> = {};
  for (const m of metrics) totals[norm(m.metric)] = (totals[norm(m.metric)] ?? 0) + m.value;
  const signups = totals["sign-ups"] ?? totals["signups"];
  const ratio = (a: number | undefined, b: number | undefined) => (a !== undefined && b ? a / b : null);
  return {
    totals,
    clickThroughRate: ratio(totals["clicks"], totals["impressions"]),
    costPerSignup: spend > 0 ? ratio(spend, signups) : null,
    costPerClick: spend > 0 ? ratio(spend, totals["clicks"]) : null,
  };
}

/** Campaigns active at any point in [from, to]. Open-ended campaigns run until `to`. */
export function campaignsOverlapping<T extends { startDate: string; endDate: string | null }>(campaigns: T[], from: string, to: string): T[] {
  const f = new Date(from).getTime();
  const t = new Date(to).getTime();
  return campaigns.filter((c) => new Date(c.startDate).getTime() <= t && (c.endDate ? new Date(c.endDate).getTime() : t) >= f);
}

export function normalizeMetricName(s: string): string {
  return norm(s);
}
