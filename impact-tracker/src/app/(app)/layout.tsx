import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { UserPicker } from "@/components/user-picker";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [users, current] = await Promise.all([db.user.findMany({ orderBy: { name: "asc" } }), getCurrentUser()]);
  return (
    <>
      <header className="border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight">
            Impact Tracker
          </Link>
          <nav className="flex gap-1 text-sm">
            <Link href="/" className="rounded px-2 py-1 text-ink-2 hover:bg-surface-2 hover:text-ink">
              Portfolio
            </Link>
            <Link href="/library" className="rounded px-2 py-1 text-ink-2 hover:bg-surface-2 hover:text-ink">
              Parameter library
            </Link>
          </nav>
          <div className="ml-auto">
            <UserPicker users={users.map((u) => ({ id: u.id, name: u.name }))} currentId={current?.id ?? ""} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 print:max-w-none print:p-0">{children}</main>
    </>
  );
}
