// Internal / external audience helpers. A metric or campaign tagged "both"
// counts towards each audience.

import type { Status } from "./status";

export type AudienceFilter = "all" | "internal" | "external";

export function parseAudienceFilter(v: string | undefined): AudienceFilter {
  return v === "internal" || v === "external" ? v : "all";
}

export function matchesAudience(tag: string, filter: AudienceFilter): boolean {
  return filter === "all" || tag === filter || tag === "both";
}

/** Status counts per audience, for "how are we doing with internal vs external audiences". */
export function audienceBreakdown(items: { audience: string; status: Status }[]) {
  const make = () => ({ green: 0, amber: 0, red: 0, "no-data": 0, "not-started": 0, total: 0 });
  const out = { internal: make(), external: make() };
  for (const i of items) {
    for (const a of ["internal", "external"] as const) {
      if (matchesAudience(i.audience, a)) {
        out[a][i.status]++;
        out[a].total++;
      }
    }
  }
  return out;
}
