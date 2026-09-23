import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { currencySymbol } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { FocusAreaForm } from "@/components/forms/programme-forms";
import { createFocusArea } from "@/server/programme-actions";
import { getProgramme } from "@/server/queries";

export default async function NewFocusAreaPage() {
  if (!can(await requireUser(), "manage-programme")) notFound();
  const [programme, users] = await Promise.all([
    getProgramme(),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div>
      <PageHeader title="New focus area" back={{ href: "/", label: "Programme" }} />
      <FocusAreaForm action={createFocusArea.bind(null, programme.id)} users={users} currencySymbol={currencySymbol(programme.currency)} cancelHref="/" />
    </div>
  );
}
