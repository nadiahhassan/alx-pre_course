import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { ProgrammeForm } from "@/components/forms/programme-forms";
import { updateProgramme } from "@/server/programme-actions";
import { getProgramme } from "@/server/queries";

export default async function ProgrammeSettingsPage() {
  if (!can(await requireUser(), "manage-programme")) notFound();
  const programme = await getProgramme();
  return (
    <div>
      <PageHeader title="Programme settings" back={{ href: "/", label: "Programme" }} />
      <ProgrammeForm action={updateProgramme.bind(null, programme.id)} programme={programme} />
    </div>
  );
}
