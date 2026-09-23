import { db } from "@/lib/db";
import { getProject } from "@/server/queries";
import { ProjectForm } from "@/components/forms/project-form";
import { ArchiveProjectButton } from "@/components/archive-project-button";
import { updateProject } from "@/server/project-actions";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, users] = await Promise.all([
    getProject(id),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="max-w-4xl space-y-8">
      <ProjectForm action={updateProject.bind(null, id)} users={users} project={project} submitLabel="Save changes" />
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="font-semibold">{project.archivedAt ? "Restore project" : "Archive project"}</h2>
          <p className="text-sm text-ink-2">
            {project.archivedAt
              ? "Show this project in the portfolio again."
              : "Hide this project from the portfolio. All data is kept and it can be restored."}
          </p>
        </div>
        <ArchiveProjectButton id={id} archived={!!project.archivedAt} />
      </section>
    </div>
  );
}
