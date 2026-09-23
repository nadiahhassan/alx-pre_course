import { db } from "@/lib/db";
import { toDateInput, today } from "@/lib/format";
import { EvidenceForm } from "@/components/forms/evidence-form";
import { createEvidence } from "@/server/evidence-actions";
import { getProject } from "@/server/queries";

export default async function NewEvidencePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ parameter?: string }>;
}) {
  const { id } = await params;
  const { parameter } = await searchParams;
  await getProject(id);
  const parameters = await db.parameter.findMany({ where: { projectId: id, archivedAt: null }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Add evidence</h2>
      <EvidenceForm
        action={createEvidence.bind(null, id)}
        parameters={parameters}
        defaultParameterId={parameter}
        defaultDate={toDateInput(today())}
        cancelHref={`/projects/${id}/evidence`}
        submitLabel="Add evidence"
      />
    </div>
  );
}
