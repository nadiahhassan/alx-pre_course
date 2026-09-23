import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toDateInput, today } from "@/lib/format";
import { EvidenceForm } from "@/components/forms/evidence-form";
import { AiTag } from "@/components/ui";
import { updateEvidence } from "@/server/evidence-actions";

export default async function EditEvidencePage({ params }: { params: Promise<{ id: string; eid: string }> }) {
  const { id, eid } = await params;
  const evidence = await db.evidence.findUnique({ where: { id: eid } });
  if (!evidence || evidence.projectId !== id) notFound();
  const parameters = await db.parameter.findMany({ where: { projectId: id, archivedAt: null }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        Edit evidence {evidence.origin === "ai" && <AiTag />}
      </h2>
      <EvidenceForm
        action={updateEvidence.bind(null, id, eid)}
        evidence={evidence}
        parameters={parameters}
        defaultDate={toDateInput(today())}
        cancelHref={`/projects/${id}/evidence`}
        submitLabel="Save changes"
      />
    </div>
  );
}
