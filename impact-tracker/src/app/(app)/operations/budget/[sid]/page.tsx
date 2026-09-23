import { notFound } from "next/navigation";
import { requirePageAbility } from "@/lib/auth";
import { db } from "@/lib/db";
import { currencySymbol, toDateInput, today } from "@/lib/format";
import { SpendForm } from "@/components/forms/operations-forms";
import { updateSpend } from "@/server/operations-actions";
import { getOperationsOptions } from "@/server/operations-options";
import { getProgramme } from "@/server/queries";

export default async function EditSpendPage({ params }: { params: Promise<{ sid: string }> }) {
  await requirePageAbility("edit-operations");
  const { sid } = await params;
  const [spend, { projects }, programme] = await Promise.all([db.spendEntry.findUnique({ where: { id: sid } }), getOperationsOptions(), getProgramme()]);
  if (!spend) notFound();
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Edit spend</h2>
      <SpendForm action={updateSpend.bind(null, sid)} spend={spend} projects={projects} currency={currencySymbol(programme.currency)} defaultDate={toDateInput(today())} />
    </div>
  );
}
