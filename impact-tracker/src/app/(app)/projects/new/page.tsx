import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ProjectForm } from "@/components/forms/project-form";
import { createProject } from "@/server/project-actions";

export default async function NewProjectPage() {
  const users = await db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div className="max-w-4xl">
      <PageHeader title="New project" back={{ href: "/", label: "Portfolio" }} />
      <ProjectForm action={createProject} users={users} submitLabel="Create project" />
    </div>
  );
}
