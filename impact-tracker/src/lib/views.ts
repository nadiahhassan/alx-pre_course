// Stakeholder views of the same dashboard data.

export const VIEWS = ["lead", "leadership", "comms", "marketing"] as const;
export type View = (typeof VIEWS)[number];

export const VIEW_LABELS: Record<View, string> = {
  lead: "Project lead",
  leadership: "Leadership",
  comms: "Comms & policy",
  marketing: "Marketing",
};

export const VIEW_BLURBS: Record<View, string> = {
  lead: "Full detail: every metric, campaign overlays and evidence.",
  leadership: "Summary: overall status, risks and key metrics.",
  comms: "Headline figures and stories for external use.",
  marketing: "Campaign performance alongside outcomes.",
};

export function parseView(v: string | undefined): View {
  return (VIEWS as readonly string[]).includes(v ?? "") ? (v as View) : "lead";
}
