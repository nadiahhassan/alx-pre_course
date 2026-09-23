import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProject } from "@/server/queries";
import { ProjectForm } from "@/components/forms/project-form";
import { ArchiveProjectButton } from "@/components/archive-project-button";
import { updateProject } from "@/server/project-actions";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [project, users, focusAreas] = await Promise.all([
    getProject(id),
    db.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.focusArea.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="max-w-4xl space-y-8">
      <ProjectForm readOnly={!can(user, "edit-data")} action={updateProject.bind(null, id)} users={users} focusAreas={focusAreas} project={project} submitLabel="Save changes" />
      {can(user, "edit-data") && <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="font-semibold">{project.archivedAt ? "Restore initiative" : "Archive initiative"}</h2>
          <p className="text-sm text-ink-2">
            {project.archivedAt
              ? "Show this initiative in the programme views again."
              : "Hide this initiative from the programme views. All data is kept and it can be restored."}
          </p>
        </div>
        <ArchiveProjectButton id={id} archived={!!project.archivedAt} />
      </section>}
    </div>
  );
}
