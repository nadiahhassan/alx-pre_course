import { requirePageAbility } from "@/lib/auth";
import { currencySymbol, toDateInput, today } from "@/lib/format";
import { SpendForm } from "@/components/forms/operations-forms";
import { createSpend } from "@/server/operations-actions";
import { getOperationsOptions } from "@/server/operations-options";
import { getProgramme } from "@/server/queries";

export default async function NewSpendPage() {
  await requirePageAbility("edit-operations");
  const [{ projects }, programme] = await Promise.all([getOperationsOptions(), getProgramme()]);
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Add spend</h2>
      <SpendForm action={createSpend} projects={projects} currency={currencySymbol(programme.currency)} defaultDate={toDateInput(today())} />
    </div>
  );
}
