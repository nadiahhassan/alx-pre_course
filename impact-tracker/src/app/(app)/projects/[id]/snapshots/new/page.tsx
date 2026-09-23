import { requirePageAbility } from "@/lib/auth";
import { SnapshotForm } from "@/components/forms/snapshot-form";
import { toDateInput, today } from "@/lib/format";
import { createSnapshot } from "@/server/snapshot-actions";
import { getProject } from "@/server/queries";

function quarterLabel(d: Date) {
  return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()} as reported`;
}

export default async function NewSnapshotPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageAbility("edit-data");
  const { id } = await params;
  await getProject(id);
  const now = today();
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Freeze a snapshot</h2>
      <SnapshotForm
        action={createSnapshot.bind(null, id)}
        defaultLabel={quarterLabel(now)}
        defaultDate={toDateInput(now)}
        cancelHref={`/projects/${id}/snapshots`}
      />
    </div>
  );
}
