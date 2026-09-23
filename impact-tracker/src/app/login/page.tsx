import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignInForm } from "@/components/forms/sign-in-form";

// Demo accounts are listed only when DEMO_ACCOUNTS=1 (set it for demo deployments, never for real data).
const DEMO = [
  ["Global lead (admin)", "lead@example.org"],
  ["Programme team", "programme@example.org"],
  ["Comms", "comms@example.org"],
  ["Government Affairs & Public Policy", "gapp@example.org"],
  ["Marketing", "marketing@example.org"],
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { next = "/" } = await searchParams;
  const showDemo = process.env.DEMO_ACCOUNTS === "1";
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <p className="text-sm font-semibold tracking-tight">Impact Tracker</p>
      <h1 className="mb-6 mt-1 text-2xl font-semibold tracking-tight">Sign in</h1>
      <div className="card p-5">
        <SignInForm next={next} />
      </div>
      <p className="mt-4 text-xs text-muted">No account? Ask the Global lead to add you.</p>
      {showDemo && (
        <div className="card mt-6 p-4 text-xs">
          <p className="font-medium">Demo accounts</p>
          <p className="mt-1 text-ink-2">
            Password for all: <code className="rounded bg-surface-2 px-1">{process.env.SEED_PASSWORD || "demo-password-2026"}</code>
          </p>
          <ul className="mt-2 space-y-1">
            {DEMO.map(([role, email]) => (
              <li key={email} className="flex justify-between gap-3">
                <span className="text-ink-2">{role}</span>
                <code>{email}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
