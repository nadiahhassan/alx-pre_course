import { requirePageAbility } from "@/lib/auth";
import Link from "next/link";
import { db } from "@/lib/db";
import { CsvImport } from "@/components/csv-import";

export default async function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAbility("edit-data");
  const { id } = await params;
  const parameters = await db.parameter.findMany({
    where: { projectId: id, archivedAt: null },
    select: { name: true },
    orderBy: { sortOrder: "asc" },
  });
  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Import entries from CSV</h2>
        <Link href={`/projects/${id}/data`} className="btn-ghost">
          Back to data entry
        </Link>
      </div>
      <CsvImport projectId={id} parameterNames={parameters.map((p) => p.name)} />
    </div>
  );
}
