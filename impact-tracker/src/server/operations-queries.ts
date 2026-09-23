import "server-only";
import { db } from "@/lib/db";
import { today } from "@/lib/format";
import { budgetHealth, deadlineState, riskRating } from "@/lib/operations";
import { expectedFraction } from "@/lib/status";
import { getProgramme } from "./queries";

/** Everything the Operations pages need, with budget health worked out. */
export async function getOperations() {
  const programme = await getProgramme();
  const now = today();
  const [focusAreas, projects, responsibilities, risks, decisions, users] = await Promise.all([
    db.focusArea.findMany({ where: { archivedAt: null }, include: { owner: true }, orderBy: { sortOrder: "asc" } }),
    db.project.findMany({ where: { archivedAt: null }, include: { spend: { include: { createdBy: true }, orderBy: { date: "desc" } } }, orderBy: { startDate: "asc" } }),
    db.responsibility.findMany({ include: { owner: true, project: true, focusArea: true }, orderBy: { dueDate: "asc" } }),
    db.risk.findMany({ include: { owner: true, project: true, focusArea: true } }),
    db.decision.findMany({ include: { project: true, focusArea: true }, orderBy: { date: "desc" } }),
    db.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  const programmeElapsed = expectedFraction(programme.startDate, programme.endDate, now);

  const initiatives = projects.map((p) => ({
    project: p,
    health: budgetHealth(p.budget ?? 0, p.spend, expectedFraction(p.startDate, p.endDate, now)),
  }));
  const areas = focusAreas.map((fa) => {
    const rows = initiatives.filter((i) => i.project.focusAreaId === fa.id);
    return { focusArea: fa, initiatives: rows, health: budgetHealth(fa.budget, rows.flatMap((r) => r.project.spend), programmeElapsed) };
  });
  const allSpend = projects.flatMap((p) => p.spend.map((s) => ({ ...s, project: p })));

  return {
    programme,
    now,
    programmeElapsed,
    programmeHealth: budgetHealth(programme.budget, allSpend, programmeElapsed),
    areas,
    initiatives,
    unassigned: initiatives.filter((i) => !i.project.focusAreaId || !focusAreas.some((f) => f.id === i.project.focusAreaId)),
    spend: allSpend.sort((a, b) => b.date.getTime() - a.date.getTime()),
    responsibilities: responsibilities.map((r) => ({ ...r, state: deadlineState(r.dueDate, r.status, now) })),
    risks: risks
      .map((r) => ({ ...r, ...riskRating(r.likelihood, r.impact) }))
      .sort((a, b) => Number(a.status === "closed") - Number(b.status === "closed") || b.score - a.score),
    decisions,
    users,
    focusAreas,
    projects,
  };
}

export type Operations = Awaited<ReturnType<typeof getOperations>>;
