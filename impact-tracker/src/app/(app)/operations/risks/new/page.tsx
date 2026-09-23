import { requirePageAbility } from "@/lib/auth";
import { RiskForm } from "@/components/forms/operations-forms";
import { createRisk } from "@/server/operations-actions";
import { getOperationsOptions } from "@/server/operations-options";

export default async function NewRiskPage() {
  await requirePageAbility("edit-operations");
  const o = await getOperationsOptions();
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Add risk</h2>
      <RiskForm action={createRisk} {...o} />
    </div>
  );
}
