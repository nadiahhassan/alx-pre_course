import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { UserForm } from "@/components/forms/user-form";
import { createUser } from "@/server/auth-actions";

export default async function NewPersonPage() {
  if (!can(await requireUser(), "manage-users")) notFound();
  return (
    <div>
      <PageHeader title="Add person" back={{ href: "/people", label: "People" }} />
      <UserForm action={createUser} />
    </div>
  );
}
