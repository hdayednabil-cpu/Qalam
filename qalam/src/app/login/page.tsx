import { PendingButton } from "@/components/pending-button";
import Link from "@/components/app-link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { Wordmark } from "@/components/shell";
import { ArrowUpRight } from "lucide-react";
import { LearningOrbit } from "@/components/learning-orbit";
import { LoginForm } from "./login-form";
import { demoLogin } from "./actions";
import { bootstrapTutor, demoEnabled } from "@/lib/bootstrap";
import { MotionToggle } from "@/components/ambient-motion";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ passwordChanged?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  await bootstrapTutor();
  const demo = demoEnabled();
  const passwordChanged = (await searchParams).passwordChanged === "1";
  return (
    <div className="min-h-dvh grid bg-surface lg:grid-cols-[1fr_1fr]">
      <div className="login-art relative isolate flex flex-col justify-between overflow-hidden p-6 text-white sm:p-8 lg:min-h-[760px] lg:p-12 xl:p-16">
        <div className="relative z-10 flex items-center justify-between"><Wordmark /><span className="text-[10px] uppercase tracking-[.18em] text-slate-400">The learning workspace</span></div>
        <div className="relative z-10 pt-7 lg:py-10">
          <LearningOrbit className="absolute -right-16 -top-20 size-64 opacity-40 lg:relative lg:right-auto lg:top-auto lg:mx-auto lg:mb-6 lg:size-80 lg:opacity-100 xl:size-96" />
          <p className="relative mb-3 text-[10px] font-semibold uppercase tracking-[.2em] text-ink-200">Clarity for every lesson</p>
          <h1 className="relative max-w-lg text-[28px] lg:text-[48px] font-semibold leading-[1.08] tracking-[-.055em] xl:text-[58px]">Small steps.<br /><span className="text-[#a5f5e0]">Lasting progress.</span></h1>
          <p className="relative mt-5 hidden max-w-sm text-sm lg:block leading-7 text-slate-300">A thoughtful space for lessons, homework and everything you’re working towards. Together.</p>
        </div>
        <div className="relative z-10 hidden items-center justify-between border-t lg:flex border-white/10 pt-5 text-[11px] text-slate-400"><span>Tutor. Student. Family.</span><span>Connected by Qalam <ArrowUpRight size={12} className="ml-1 inline" /></span></div>
      </div>
      <div className="relative flex flex-col justify-center px-6 py-8 sm:px-12 lg:py-12">
        <div className="mx-auto w-full max-w-[370px]">
          <div className="mb-8"><p className="label mb-3 text-ink-600">Your next chapter</p><h2 className="text-[34px] font-bold leading-tight">{t("auth.welcomeBack")}</h2><p className="mt-3 text-sm leading-6 text-mute">Sign in to pick up where you left off.</p></div>
          {passwordChanged && <p role="status" className="mb-4 rounded-xl bg-moss-100 px-3 py-2 text-sm text-moss-700">Your password has been changed and all sessions signed out. Sign in with your new password.</p>}
          <LoginForm labels={{ identifier: t("auth.identifier"), password: t("auth.password"), signIn: t("auth.signIn"), invalid: t("auth.invalid"), throttled: t("auth.tooManyAttempts") }} />
          <p className="mt-3 text-xs text-mute">{t("auth.forgot")}</p>
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6 text-sm">
            <Link href="/activate" className="font-semibold text-ink-600 hover:underline">
              {t("auth.haveCode")} →
            </Link>
            <MotionToggle />
          </div>
          {demo && (
            <div className="mt-6 rounded-2xl border border-line bg-paper p-4 shadow-card">
              <div className="label mb-2 flex items-center gap-1.5">
                <span className="inline-block size-1.5 rounded-full bg-saffron-500" />
                {t("auth.demoTitle")}
              </div>
              <div className="grid gap-2">
                {(["tutor", "parent", "student"] as const).map((who) => (
                  <form key={who} action={demoLogin}>
                    <input type="hidden" name="who" value={who} />
                    <PendingButton pendingLabel="Signing in…" className="btn-secondary w-full bg-white" type="submit">
                      {t(who === "tutor" ? "auth.demoTutor" : who === "parent" ? "auth.demoParent" : "auth.demoStudent")}
                    </PendingButton>
                  </form>
                ))}
              </div>
              <p className="mt-2 text-xs text-mute">Password for every demo account: demo1234</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
