"use client";
import { useActionState } from "react";
import { activate, type ActivateState } from "./actions";

export function ActivateForm({ labels, initialCode }: { labels: Record<string, string>; initialCode?: string }) {
  const [state, action, pending] = useActionState(activate, { step: "code", code: initialCode } as ActivateState);
  return (
    <form action={action} className="space-y-4">
      {state.step === "code" ? (
        <label className="block">
          <span className="label mb-1.5 block">{labels.enterCode}</span>
          <input name="code" className="input font-mono uppercase tracking-wider" placeholder={labels.codePlaceholder} defaultValue={initialCode} autoCapitalize="characters" required />
        </label>
      ) : (
        <>
          <input type="hidden" name="code" value={state.code} />
          <p className="rounded-xl bg-moss-100 px-3 py-2 text-sm text-moss-700">
            Hi {state.name} — {labels.createCredentials}
          </p>
          {state.role === "guardian" ? (
            <label className="block">
              <span className="label mb-1.5 block">{labels.email}</span>
              <input name="email" type="email" className="input" autoComplete="email" required />
            </label>
          ) : (
            <label className="block">
              <span className="label mb-1.5 block">{labels.username}</span>
              <input name="username" className="input" autoComplete="username" autoCapitalize="none" required minLength={3} />
              <span className="mt-1 block text-xs text-mute">No email needed — pick something you will remember.</span>
            </label>
          )}
          <label className="block">
            <span className="label mb-1.5 block">{labels.password}</span>
            <input name="password" type="password" className="input" autoComplete="new-password" required minLength={8} />
          </label>
          <label className="block">
            <span className="label mb-1.5 block">{labels.confirmPassword}</span>
            <input name="confirm" type="password" className="input" autoComplete="new-password" required minLength={8} />
          </label>
        </>
      )}
      {state.error && <p className="rounded-xl bg-coral-100 px-3 py-2 text-sm text-coral-700">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending} type="submit">
        {state.step === "code" ? labels.next : labels.activate}
      </button>
    </form>
  );
}
