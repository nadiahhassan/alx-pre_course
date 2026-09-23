import { notFound } from "next/navigation";
import { requirePageAbility } from "@/lib/auth";
import { db } from "@/lib/db";
import { toDateInput, today } from "@/lib/format";
import { DecisionForm } from "@/components/forms/operations-forms";
import { updateDecision } from "@/server/operations-actions";
import { getOperationsOptions } from "@/server/operations-options";

export default async function EditDecisionPage({ params }: { params: Promise<{ did: string }> }) {
  await requirePageAbility("edit-operations");
  const { did } = await params;
  const [decision, { focusAreas, projects }] = await Promise.all([db.decision.findUnique({ where: { id: did } }), getOperationsOptions()]);
  if (!decision) notFound();
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Edit decision</h2>
      <DecisionForm action={updateDecision.bind(null, did)} decision={decision} focusAreas={focusAreas} projects={projects} defaultDate={toDateInput(today())} />
    </div>
  );
}
