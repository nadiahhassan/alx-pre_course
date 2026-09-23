import { requireUser } from "@/lib/auth";
import { ROLE_LABELS, TEAM_LABELS, type Role, type Team } from "@/lib/constants";
import { PageHeader } from "@/components/ui";
import { PasswordForm } from "@/components/forms/user-form";
import { changePassword } from "@/server/auth-actions";

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Your account"
        subtitle={
          <>
            {user.email} · {ROLE_LABELS[user.role as Role]}
            {user.team && ` · ${TEAM_LABELS[user.team as Team]}`}
          </>
        }
      />
      <PasswordForm action={changePassword} />
    </div>
  );
}
