"use client";
import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm({ labels }: { labels: { identifier: string; password: string; signIn: string; invalid: string; throttled: string } }) {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="label mb-1.5 block">{labels.identifier}</span>
        <input name="identifier" className="input" placeholder="Email or username" autoComplete="username" autoCapitalize="none" required />
      </label>
      <label className="block">
        <span className="label mb-1.5 block">{labels.password}</span>
        <input name="password" type="password" className="input" placeholder="Your password" autoComplete="current-password" required />
      </label>
      {state?.error && <p className="rounded-xl bg-coral-100 px-3 py-2 text-sm text-coral-700">{state.error === "throttled" ? labels.throttled : labels.invalid}</p>}
      <button className="btn-primary mt-1 w-full py-3" disabled={pending} type="submit">
        {labels.signIn}
      </button>
    </form>
  );
}
