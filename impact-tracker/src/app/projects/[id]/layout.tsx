import Link from "next/link";
import { getProject } from "@/server/queries";
import { ProjectTabs } from "@/components/project-tabs";
import { formatDate } from "@/lib/format";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  return (
    <div>
      <Link href="/" className="mb-2 inline-block text-sm text-ink-2 hover:text-ink">
        ← Portfolio
      </Link>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        {project.archivedAt && <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-ink-2">Archived</span>}
        <p className="text-sm text-ink-2">
          <span className="capitalize">{project.status}</span>
          {project.region && <> · {project.region}</>} · {formatDate(project.startDate)} – {formatDate(project.endDate)}
          {project.owner && <> · Owner: {project.owner.name}</>}
        </p>
      </div>
      <ProjectTabs projectId={id} />
      {children}
    </div>
  );
}
