"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { login } from "./actions";

export function LoginForm({ labels }: { labels: { identifier: string; password: string; signIn: string; invalid: string; throttled: string } }) {
  const [state, action, pending] = useActionState(login, {});
  const [visible, setVisible] = useState(false);
  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="label mb-1.5 block">{labels.identifier}</span>
        <input name="identifier" className="input" placeholder="Email or username" autoComplete="username" autoCapitalize="none" spellCheck={false} aria-invalid={!!state?.error} aria-describedby={state?.error ? "login-error" : undefined} required />
      </label>
      <div>
        <label htmlFor="login-password" className="label mb-1.5 block">{labels.password}</label>
        <div className="relative">
          <input id="login-password" name="password" type={visible ? "text" : "password"} className="input pr-12" placeholder="Your password" autoComplete="current-password" aria-invalid={!!state?.error} aria-describedby={state?.error ? "login-error" : undefined} required />
          <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-xl text-mute hover:text-ink-700">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>
      </div>
      {state?.error && <p id="login-error" role="alert" className="rounded-xl bg-coral-100 px-3 py-2 text-sm text-coral-700">{state.error === "throttled" ? labels.throttled : labels.invalid}</p>}
      <button className="btn-primary mt-1 w-full py-3" disabled={pending} aria-busy={pending} type="submit">
        {pending ? <><LoaderCircle size={16} className="animate-spin" aria-hidden="true" /><span role="status">Signing in…</span></> : labels.signIn}
      </button>
    </form>
  );
}
