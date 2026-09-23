"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui";
import { fieldDefault, formKey, type FormState } from "@/lib/forms";
import { signIn } from "@/server/auth-actions";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, {} as FormState);
  return (
    <form key={formKey(state)} action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email">
        <input id="email" name="email" type="email" autoComplete="username" className="input" defaultValue={fieldDefault(state, "email", "")} required autoFocus />
      </Field>
      <Field label="Password" name="password">
        <input id="password" name="password" type="password" autoComplete="current-password" className="input" required />
      </Field>
      {state.errors?._form && <p className="text-sm text-critical-ink">{state.errors._form}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
