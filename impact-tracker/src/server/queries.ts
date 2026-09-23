import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buildDashboard } from "@/lib/dashboard";

export const getProject = cache(async (id: string) => {
  const project = await db.project.findUnique({ where: { id }, include: { owner: true } });
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
