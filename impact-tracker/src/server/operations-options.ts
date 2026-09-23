import "server-only";
import { db } from "@/lib/db";

/** Select options shared by the operations forms. */
export async function getOperationsOptions() {
  const [users, focusAreas, projects] = await Promise.all([
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.focusArea.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
    db.project.findMany({ where: { archivedAt: null }, select: { id: true, name: true }, orderBy: { startDate: "asc" } }),
  ]);
  return { users, focusAreas, projects };
}
