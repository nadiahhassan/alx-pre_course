import { notFound } from "next/navigation";
import { requirePageAbility } from "@/lib/auth";
import { db } from "@/lib/db";
import { toDateInput, today } from "@/lib/format";
import { ResponsibilityForm } from "@/components/forms/operations-forms";
import { updateResponsibility } from "@/server/operations-actions";
import { getOperationsOptions } from "@/server/operations-options";

export default async function EditResponsibilityPage({ params }: { params: Promise<{ rid: string }> }) {
  await requirePageAbility("edit-operations");
  const { rid } = await params;
  const [item, o] = await Promise.all([db.responsibility.findUnique({ where: { id: rid } }), getOperationsOptions()]);
  if (!item) notFound();
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Edit responsibility</h2>
      <ResponsibilityForm action={updateResponsibility.bind(null, rid)} item={item} {...o} defaultDate={toDateInput(today())} />
    </div>
  );
}
