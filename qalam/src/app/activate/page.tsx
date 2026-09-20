import Link from "next/link";
import { Wordmark } from "@/components/shell";
import { t } from "@/lib/i18n";
import { ActivateForm } from "./activate-form";

export default async function ActivatePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Wordmark className="mb-8" />
        <h1 className="text-2xl font-semibold mb-1">{t("auth.activate")}</h1>
        <p className="text-sm text-mute mb-6">Your tutor gave you a code. Enter it to create your login.</p>
        <ActivateForm initialCode={code} labels={{ enterCode: t("auth.enterCode"), codePlaceholder: t("auth.codePlaceholder"), createCredentials: t("auth.createCredentials"), email: t("auth.email"), username: t("auth.username"), password: t("auth.password"), confirmPassword: t("auth.confirmPassword"), next: "Continue", activate: t("auth.activate") }} />
        <p className="mt-6 text-sm">
          <Link href="/login" className="text-ink-700 hover:underline">
            ← {t("auth.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
