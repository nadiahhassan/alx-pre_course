import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { currencySymbol } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { FocusAreaForm } from "@/components/forms/programme-forms";
import { FocusAreaArchiveButton } from "@/components/focus-area-archive-button";
import { updateFocusArea } from "@/server/programme-actions";
import { getProgramme } from "@/server/queries";

export default async function EditFocusAreaPage({ params }: { params: Promise<{ fid: string }> }) {
  if (!can(await requireUser(), "manage-programme")) notFound();
  const { fid } = await params;
  const [programme, focusArea, users] = await Promise.all([
    getProgramme(),
    db.focusArea.findUnique({ where: { id: fid } }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!focusArea) notFound();
  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${focusArea.name}`} back={{ href: `/focus-areas/${fid}`, label: focusArea.name }} />
      <FocusAreaForm
        action={updateFocusArea.bind(null, fid)}
        focusArea={focusArea}
        users={users}
        currencySymbol={currencySymbol(programme.currency)}
        cancelHref={`/focus-areas/${fid}`}
      />
      <FocusAreaArchiveButton id={fid} archived={!!focusArea.archivedAt} />
    </div>
  );
}
