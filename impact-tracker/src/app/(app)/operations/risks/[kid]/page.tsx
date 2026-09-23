import { notFound } from "next/navigation";
import { requirePageAbility } from "@/lib/auth";
import { db } from "@/lib/db";
import { RiskForm } from "@/components/forms/operations-forms";
import { updateRisk } from "@/server/operations-actions";
import { getOperationsOptions } from "@/server/operations-options";

export default async function EditRiskPage({ params }: { params: Promise<{ kid: string }> }) {
  await requirePageAbility("edit-operations");
  const { kid } = await params;
  const [risk, o] = await Promise.all([db.risk.findUnique({ where: { id: kid } }), getOperationsOptions()]);
  if (!risk) notFound();
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Edit risk</h2>
      <RiskForm action={updateRisk.bind(null, kid)} risk={risk} {...o} />
    </div>
  );
}
