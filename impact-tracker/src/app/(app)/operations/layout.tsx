import { requireUser } from "@/lib/auth";
import { OperationsTabs } from "@/components/operations/ops-controls";
import { getProgramme } from "@/server/queries";

export default async function OperationsLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const programme = await getProgramme();
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">{programme.name}</p>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Operations</h1>
      <p className="mb-4 max-w-3xl text-sm text-ink-2">Budget, responsibilities, risks and decisions across focus areas, so the Global lead can keep delivery on track.</p>
      <OperationsTabs />
      {children}
    </div>
  );
}
