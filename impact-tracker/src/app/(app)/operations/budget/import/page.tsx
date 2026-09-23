import { requirePageAbility } from "@/lib/auth";
import { SpendImport } from "@/components/operations/ops-controls";

export default async function SpendImportPage() {
  await requirePageAbility("edit-operations");
  return (
    <div className="max-w-4xl">
      <h2 className="mb-4 text-lg font-semibold">Import spend from finance</h2>
      <SpendImport />
    </div>
  );
}
