import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { Wordmark } from "@/components/shell";
import { ArrowUpRight, BookOpen, Check } from "lucide-react";
import { LoginForm } from "./login-form";
import { demoLogin } from "./actions";
import { bootstrapTutor, demoEnabled } from "@/lib/bootstrap";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ passwordChanged?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  await bootstrapTutor();
  const demo = demoEnabled();
  const passwordChanged = (await searchParams).passwordChanged === "1";
  return (
    <div className="min-h-dvh grid bg-surface lg:grid-cols-[1fr_1fr]">
      <div className="login-art relative isolate hidden min-h-[760px] overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="relative z-10 flex items-center justify-between"><Wordmark /><span className="text-[10px] uppercase tracking-[.18em] text-slate-400">The learning workspace</span></div>
        <div className="relative z-10 py-10">
          <div aria-hidden="true" className="lesson-sculpture relative mx-auto mb-14 h-48 w-40 xl:h-56 xl:w-48">
            <div className="lesson-sheet" /><div className="lesson-sheet" />
            <div className="lesson-sheet flex flex-col justify-between p-6 text-ink-900">
              <div className="flex items-start justify-between"><BookOpen size={26} strokeWidth={1.5} /><span className="text-[10px] font-medium tracking-widest">Q / 01</span></div>
              <div className="space-y-2"><div className="h-1.5 w-3/4 rounded-full bg-ink-200" /><div className="h-1.5 w-full rounded-full bg-ink-100" /><div className="h-1.5 w-1/2 rounded-full bg-ink-100" /></div>
              <div className="flex items-center gap-2 text-xs font-semibold"><span className="flex size-5 items-center justify-center rounded-full bg-ink-600 text-white"><Check size={12} /></span> One step forward.</div>
            </div>
          </div>
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[.2em] text-ink-200">Clarity for every lesson</p>
          <h1 className="max-w-lg text-[48px] font-semibold leading-[1.08] tracking-[-.055em] xl:text-[58px]">Small steps.<br /><span className="text-ink-200">Lasting progress.</span></h1>
          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">A thoughtful space for lessons, homework and everything you’re working towards. Together.</p>
        </div>
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-5 text-[11px] text-slate-400"><span>Tutor. Student. Family.</span><span>Connected by Qalam <ArrowUpRight size={12} className="ml-1 inline" /></span></div>
      </div>
      <div className="relative flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-[370px]">
          <div className="mb-14 lg:hidden"><Wordmark /></div>
          <div className="mb-8"><p className="label mb-3 text-ink-600">Your next chapter</p><h2 className="text-[34px] font-bold leading-tight">{t("auth.welcomeBack")}</h2><p className="mt-3 text-sm leading-6 text-mute">Sign in to pick up where you left off.</p></div>
          {passwordChanged && <p role="status" className="mb-4 rounded-xl bg-moss-100 px-3 py-2 text-sm text-moss-700">Your password has been changed and all sessions signed out. Sign in with your new password.</p>}
          <LoginForm labels={{ identifier: t("auth.identifier"), password: t("auth.password"), signIn: t("auth.signIn"), invalid: t("auth.invalid"), throttled: t("auth.tooManyAttempts") }} />
          <p className="mt-3 text-xs text-mute">{t("auth.forgot")}</p>
          <div className="mt-8 border-t border-line pt-6 text-sm">
            <Link href="/activate" className="font-semibold text-ink-600 hover:underline">
              {t("auth.haveCode")} →
            </Link>
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
                    <button className="btn-secondary w-full bg-white" type="submit">
                      {t(who === "tutor" ? "auth.demoTutor" : who === "parent" ? "auth.demoParent" : "auth.demoStudent")}
                    </button>
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
