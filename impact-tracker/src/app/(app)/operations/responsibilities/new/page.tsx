import { requirePageAbility } from "@/lib/auth";
import { toDateInput, today } from "@/lib/format";
import { ResponsibilityForm } from "@/components/forms/operations-forms";
import { createResponsibility } from "@/server/operations-actions";
import { getOperationsOptions } from "@/server/operations-options";

export default async function NewResponsibilityPage() {
  await requirePageAbility("edit-operations");
  const o = await getOperationsOptions();
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Add responsibility</h2>
      <ResponsibilityForm action={createResponsibility} {...o} defaultDate={toDateInput(today())} />
    </div>
  );
}
