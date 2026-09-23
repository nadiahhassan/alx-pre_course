"use client";

import Link from "next/link";

// Shown when a page or action fails, e.g. someone tries an action their role doesn't allow.
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-lg space-y-3 p-6 text-center">
      <h1 className="text-lg font-semibold">That didn’t work</h1>
      <p className="text-sm text-ink-2">
        You may not have permission for this action, or something went wrong on our side. If you think you should have access, ask the Global
        lead to check your role.
      </p>
      <div className="flex justify-center gap-2">
        <button className="btn-secondary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn-primary">
          Back to the programme
        </Link>
      </div>
    </div>
  );
}
