"use client";
import { useActionState } from "react";
import { changePassword } from "./actions";

const errors: Record<string, string> = {
  invalid: "Your current password could not be verified. Check it and try again.",
  length: "Use at least 12 characters. Choose a shorter password if it contains many symbols or non-English characters.",
  mismatch: "The new passwords do not match.",
  same: "Choose a password different from your current one.",
  throttled: "Too many attempts. Wait 10 minutes before trying again.",
  unavailable: "We could not complete the change. Try again. If you have been signed out, use your new password.",
};

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {});
  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="label mb-1.5 block">Current password</span>
        <input name="currentPassword" type="password" className="input" autoComplete="current-password" required />
      </label>
      <label className="block">
        <span className="label mb-1.5 block">New password</span>
        <input name="newPassword" type="password" className="input" autoComplete="new-password" minLength={12} maxLength={72} aria-describedby="password-help" required />
      </label>
      <label className="block">
        <span className="label mb-1.5 block">Confirm new password</span>
        <input name="confirmPassword" type="password" className="input" autoComplete="new-password" minLength={12} maxLength={72} required />
      </label>
      <p id="password-help" className="text-sm text-mute">Use a unique password with at least 12 characters. A few unrelated words work well.</p>
      {state.error && <p role="alert" className="rounded-xl bg-coral-100 px-3 py-2 text-sm text-coral-700">{errors[state.error] ?? errors.unavailable}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>{pending ? "Changing password…" : "Change password and sign out"}</button>
    </form>
  );
}
