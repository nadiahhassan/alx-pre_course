import { requirePageAbility } from "@/lib/auth";
import { db } from "@/lib/db";
import { ParameterForm, type ParameterDefaults } from "@/components/forms/parameter-form";
import { createParameter } from "@/server/parameter-actions";
import { getProject } from "@/server/queries";

export default async function NewParameterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  await requirePageAbility("edit-data");
  const { id } = await params;
  const { from } = await searchParams;
  await getProject(id);
  const [others, libraryItem] = await Promise.all([
    db.parameter.findMany({ where: { projectId: id, archivedAt: null }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
    from ? db.libraryParameter.findUnique({ where: { id: from } }) : null,
  ]);
  const defaults: ParameterDefaults = libraryItem
    ? {
        name: libraryItem.name,
        definition: libraryItem.definition,
        level: libraryItem.level,
        unit: libraryItem.unit,
        direction: libraryItem.direction,
        measureType: libraryItem.measureType,
        frequency: libraryItem.frequency,
        dataSource: libraryItem.dataSource,
        libraryItemId: libraryItem.id,
      }
    : {};

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">{libraryItem ? "Add parameter from library" : "New parameter"}</h2>
      <ParameterForm
        action={createParameter.bind(null, id)}
        mode="project"
        defaults={defaults}
        otherParameters={others}
        cancelHref={`/projects/${id}/parameters`}
        submitLabel="Add parameter"
        libraryName={libraryItem?.name}
      />
    </div>
  );
}
