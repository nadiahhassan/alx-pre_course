// AI-generated items must be approved by a person before any stakeholder
// view (stakeholder tabs, snapshots, share links) can show them.

export interface Governed {
  origin: string;
  approvedAt: Date | string | null;
}

export function isStakeholderVisible(item: Governed): boolean {
  return item.origin !== "ai" || item.approvedAt !== null;
}

export function needsApproval(item: Governed): boolean {
  return item.origin === "ai" && item.approvedAt === null;
}
