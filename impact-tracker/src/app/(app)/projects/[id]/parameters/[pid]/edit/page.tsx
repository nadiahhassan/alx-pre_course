import { requirePageAbility } from "@/lib/auth";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { toDateInput } from "@/lib/format";
import { ParameterForm } from "@/components/forms/parameter-form";
import { updateParameter } from "@/server/parameter-actions";

export default async function EditParameterPage({ params }: { params: Promise<{ id: string; pid: string }> }) {
  await requirePageAbility("edit-data");
  const { id, pid } = await params;
  const parameter = await db.parameter.findUnique({ where: { id: pid }, include: { libraryItem: true } });
  if (!parameter || parameter.projectId !== id) notFound();
  const others = await db.parameter.findMany({
    where: { projectId: id, archivedAt: null, NOT: { id: pid } },
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Edit parameter</h2>
      <ParameterForm
        action={updateParameter.bind(null, id, pid)}
        mode="project"
        defaults={{ ...parameter, targetDate: toDateInput(parameter.targetDate) }}
        otherParameters={others}
        cancelHref={`/projects/${id}/parameters`}
        submitLabel="Save changes"
        libraryName={parameter.libraryItem?.name}
      />
    </div>
  );
}
