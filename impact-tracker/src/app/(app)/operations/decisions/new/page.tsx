import { requirePageAbility } from "@/lib/auth";
import { toDateInput, today } from "@/lib/format";
import { DecisionForm } from "@/components/forms/operations-forms";
import { createDecision } from "@/server/operations-actions";
import { getOperationsOptions } from "@/server/operations-options";

export default async function NewDecisionPage() {
  await requirePageAbility("edit-operations");
  const { focusAreas, projects } = await getOperationsOptions();
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Log a decision</h2>
      <DecisionForm action={createDecision} focusAreas={focusAreas} projects={projects} defaultDate={toDateInput(today())} />
    </div>
  );
}
