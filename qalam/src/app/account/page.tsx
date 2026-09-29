import Link from "next/link";
import { requireUser, homeFor } from "@/lib/auth";
import { Card } from "@/components/ui";
import { Wordmark } from "@/components/shell";
import { PasswordForm } from "./password-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <main className="min-h-dvh bg-paper px-5 py-8 sm:py-12">
      <div className="mx-auto max-w-lg space-y-7">
        <div className="flex items-center justify-between gap-4">
          <Link href={homeFor(user.role)}><Wordmark /></Link>
          <Link href={homeFor(user.role)} className="text-sm text-mute hover:underline">Back to dashboard</Link>
        </div>
        <div>
          <p className="label mb-2">Your account</p>
          <h1 className="text-3xl font-semibold">Change your password</h1>
          <p className="mt-2 text-sm text-mute">{user.displayName} · {user.email ?? user.username}</p>
        </div>
        <Card>
          <p className="mb-6 text-sm text-mute">Changing your password signs you out on all devices. Sign in again with your new password afterward.</p>
          <PasswordForm />
        </Card>
      </div>
    </main>
  );
}
