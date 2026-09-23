import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { UserForm } from "@/components/forms/user-form";
import { updateUser } from "@/server/auth-actions";

export default async function EditPersonPage({ params }: { params: Promise<{ uid: string }> }) {
  if (!can(await requireUser(), "manage-users")) notFound();
  const { uid } = await params;
  const user = await db.user.findUnique({ where: { id: uid } });
  if (!user) notFound();
  return (
    <div>
      <PageHeader title={`Edit ${user.name}`} back={{ href: "/people", label: "People" }} />
      <UserForm action={updateUser.bind(null, uid)} user={user} />
    </div>
  );
}
