import { headers } from "next/headers";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { parseView, VIEW_LABELS, type View } from "@/lib/views";
import { ShareForm } from "@/components/forms/share-form";
import { ShareLinkActions } from "@/components/share-link-row";
import { createShareLink } from "@/server/snapshot-actions";
import { getProject } from "@/server/queries";

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; source?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  await getProject(id);
  const [snapshots, links] = await Promise.all([
    db.snapshot.findMany({ where: { projectId: id }, select: { id: true, label: true }, orderBy: { asOfDate: "desc" } }),
    db.shareLink.findMany({ where: { projectId: id }, include: { snapshot: { select: { label: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const active = links.filter((l) => !l.revokedAt);
  const revoked = links.filter((l) => l.revokedAt);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Share a read-only view</h2>
        <p className="text-sm text-ink-2">
          Links show one stakeholder view and never include AI-generated items that haven’t been approved. Use Print / save as PDF on any
          dashboard for a PDF copy.
        </p>
      </div>
      <ShareForm
        action={createShareLink.bind(null, id)}
        snapshots={snapshots}
        defaultView={sp.view ? parseView(sp.view) : "leadership"}
        defaultSource={snapshots.some((s) => s.id === sp.source) ? sp.source! : "live"}
      />
      <section>
        <h3 className="mb-2 text-sm font-semibold">Active links</h3>
        {active.length === 0 ? (
          <p className="text-sm text-muted">No links yet.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {active.map((l) => {
              const url = `${origin}/share/${l.token}`;
              return (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {VIEW_LABELS[l.view as View] ?? l.view} · {l.snapshot ? `Snapshot: ${l.snapshot.label}` : "Live"}
                      {l.label && <span className="font-normal text-ink-2"> · {l.label}</span>}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {url} · created {formatDate(l.createdAt)}
                    </div>
                  </div>
                  <ShareLinkActions projectId={id} linkId={l.id} url={url} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {revoked.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-ink-2">Revoked links ({revoked.length})</summary>
          <ul className="mt-2 space-y-1 text-xs text-muted">
            {revoked.map((l) => (
              <li key={l.id}>
                {VIEW_LABELS[l.view as View] ?? l.view} · {l.snapshot ? l.snapshot.label : "Live"} · revoked {formatDate(l.revokedAt)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
