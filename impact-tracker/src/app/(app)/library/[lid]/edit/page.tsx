import { requirePageAbility } from "@/lib/auth";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ParameterForm } from "@/components/forms/parameter-form";
import { updateLibraryParameter } from "@/server/parameter-actions";

export default async function EditLibraryParameterPage({ params }: { params: Promise<{ lid: string }> }) {
  await requirePageAbility("edit-data");
  const { lid } = await params;
  const item = await db.libraryParameter.findUnique({ where: { id: lid } });
  if (!item) notFound();
  return (
    <div>
      <PageHeader title="Edit library definition" back={{ href: "/library", label: "Parameter library" }} />
      <ParameterForm
        action={updateLibraryParameter.bind(null, lid)}
        mode="library"
        defaults={item}
        cancelHref="/library"
        submitLabel="Save changes"
      />
    </div>
  );
}
