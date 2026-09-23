import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { ROLE_LABELS, TEAM_LABELS, type Role, type Team } from "@/lib/constants";
import { SignOutButton } from "@/components/sign-out-button";

const navLink = "rounded px-2 py-1 text-ink-2 hover:bg-surface-2 hover:text-ink";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const who = user.role === "partner" && user.team ? TEAM_LABELS[user.team as Team] : ROLE_LABELS[user.role as Role];
  return (
    <>
      <header className="border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight">
            Impact Tracker
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            <Link href="/" className={navLink}>
              Programme
            </Link>
            <Link href="/library" className={navLink}>
              Parameter library
            </Link>
            {can(user, "manage-users") && (
              <Link href="/people" className={navLink}>
                People
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <Link href="/account" className={navLink} title="Your account">
              {user.name} <span className="text-muted">· {who}</span>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 print:max-w-none print:p-0">{children}</main>
    </>
  );
}
