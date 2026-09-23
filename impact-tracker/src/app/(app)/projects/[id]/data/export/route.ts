import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { toDateInput } from "@/lib/format";

// Long-format CSV of every entry; re-importable as-is.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) return new Response("Not found", { status: 404 });
  const entries = await db.entry.findMany({
    where: { parameter: { projectId: id } },
    include: { parameter: true, loggedBy: true },
    orderBy: [{ parameter: { sortOrder: "asc" } }, { date: "asc" }],
  });
  const csv = toCsv([
    ["parameter", "date", "value", "confidence", "note", "logged_by"],
    ...entries.map((e) => [e.parameter.name, toDateInput(e.date), e.value, e.confidence, e.note, e.loggedBy?.name ?? ""]),
  ]);
  const filename = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-entries.csv`;
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` },
  });
}
