import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { ProjectForm } from "@/components/forms/project-form";
import { createProject } from "@/server/project-actions";
import { getProgramme } from "@/server/queries";

export default async function NewInitiativePage({ searchParams }: { searchParams: Promise<{ focusArea?: string }> }) {
  if (!can(await requireUser(), "edit-data")) notFound();
  const { focusArea } = await searchParams;
  const [programme, users, focusAreas] = await Promise.all([
    getProgramme(),
    db.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.focusArea.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="max-w-4xl">
      <PageHeader title="New initiative" back={{ href: focusArea ? `/focus-areas/${focusArea}` : "/", label: "Back" }} />
      <ProjectForm
        action={createProject}
        users={users}
        focusAreas={focusAreas}
        defaultFocusAreaId={focusArea}
        defaultCurrency={programme.currency}
        submitLabel="Create initiative"
      />
    </div>
  );
}
