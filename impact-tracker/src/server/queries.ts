import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buildDashboard } from "@/lib/dashboard";
import { buildPayload, type DashboardPayload } from "@/lib/payload";

export const getProject = cache(async (id: string) => {
  const project = await db.project.findUnique({ where: { id }, include: { owner: true, focusArea: true } });
  if (!project) notFound();
  return project;
});

export const getProjectDashboard = cache(async (id: string, asOf: Date = new Date()) => {
  const project = await getProject(id);
  const parameters = await db.parameter.findMany({
    where: { projectId: id, archivedAt: null },
    include: { entries: true },
  });
  return buildDashboard(project, parameters, asOf);
});

/** Live payload. `stakeholderSafe` leaves out unapproved AI-generated items. */
export async function getPayload(projectId: string, asOf: Date, stakeholderSafe: boolean): Promise<DashboardPayload> {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();
  const [parameters, campaigns, evidence] = await Promise.all([
    db.parameter.findMany({ where: { projectId, archivedAt: null }, include: { entries: true } }),
    db.campaign.findMany({ where: { projectId }, include: { metrics: true } }),
    db.evidence.findMany({ where: { projectId } }),
  ]);
  return buildPayload({ project, parameters, campaigns, evidence }, asOf, { stakeholderSafe });
}

export function parsePayload(json: string): DashboardPayload {
  return JSON.parse(json) as DashboardPayload;
}

/** The programme. Databases created before programmes existed get a default one. */
export const getProgramme = cache(async () => {
  const existing = await db.programme.findFirst();
  if (existing) return existing;
  const year = new Date().getUTCFullYear();
  return db.programme.create({
    data: { name: "Programme", startDate: new Date(Date.UTC(year, 0, 1)), endDate: new Date(Date.UTC(year, 11, 31)) },
  });
});

/** Everything the programme home and focus area pages need. */
export async function getProgrammeOverview(opts: { includeArchived?: boolean } = {}) {
  const programme = await getProgramme();
  const [focusAreas, projects] = await Promise.all([
    db.focusArea.findMany({
      where: { programmeId: programme.id, ...(opts.includeArchived ? {} : { archivedAt: null }) },
      include: { owner: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.project.findMany({
      where: opts.includeArchived ? {} : { archivedAt: null },
      include: { owner: true, parameters: { where: { archivedAt: null }, include: { entries: true } } },
      orderBy: { startDate: "asc" },
    }),
  ]);
  const initiatives = projects.map((p) => ({ project: p, dash: buildDashboard(p, p.parameters) }));
  return { programme, focusAreas, initiatives };
}
