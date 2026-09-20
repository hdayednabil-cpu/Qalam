import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { Wordmark } from "@/components/shell";
import { OrreryHero } from "@/components/orrery";
import { AmbientBackground } from "@/components/ambient-background";
import { LoginForm } from "./login-form";
import { demoLogin } from "./actions";
import { bootstrapTutor, demoEnabled } from "@/lib/bootstrap";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  await bootstrapTutor();
  const demo = demoEnabled();
  return (
    <div className="min-h-dvh grid bg-paper lg:grid-cols-[1.15fr_1fr]">
      <div className="relative isolate hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <AmbientBackground variant="dark" />
        <Link href="#" className="relative z-10 fade-up w-fit">
          <Wordmark className="text-white" />
        </Link>
        <div className="relative z-10 flex flex-col items-start gap-8">
          <div className="fade-up fade-up-1">
            <OrreryHero size={200} />
          </div>
          <div className="fade-up fade-up-2 max-w-md">
            <p className="label mb-3 text-saffron-300">Private tutoring, run properly</p>
            <h1 className="text-4xl leading-[1.05] font-medium text-white md:text-5xl">{t("app.tagline")}</h1>
            <p className="mt-5 max-w-md leading-relaxed text-white/70">
              Sessions, homework, curriculum coverage and revision plans for a private tutoring practice — one calm place for the tutor, the student and the family.
            </p>
          </div>
        </div>
        <p className="relative z-10 fade-up fade-up-3 text-xs tracking-wide text-white/45">Doha · Asia/Qatar · week starts Sunday</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="fade-up w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Wordmark />
          </div>
          <h2 className="mb-1 text-2xl font-semibold">{t("auth.welcomeBack")}</h2>
          <p className="mb-6 text-sm text-mute">{t("auth.signIn")}</p>
          <LoginForm labels={{ identifier: t("auth.identifier"), password: t("auth.password"), signIn: t("auth.signIn"), invalid: t("auth.invalid"), throttled: t("auth.tooManyAttempts") }} />
          <p className="mt-3 text-xs text-mute">{t("auth.forgot")}</p>
          <div className="mt-6 border-t border-line pt-5 text-sm">
            <Link href="/activate" className="font-medium text-ink-700 hover:underline">
              {t("auth.haveCode")} →
            </Link>
          </div>
          {demo && (
            <div className="mt-6 rounded-2xl border border-saffron-300/60 bg-gradient-to-br from-saffron-100/70 via-surface to-surface p-4 shadow-card">
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
