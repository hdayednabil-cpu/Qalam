"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { activateInvitation, checkInvitation } from "@/lib/mutations";
import { createSessionCookie, throttle } from "@/lib/auth";
import { t } from "@/lib/i18n";

export type ActivateState = { step: "code" | "credentials" | "done"; code?: string; role?: "guardian" | "student"; name?: string; error?: string };

export async function activate(prev: ActivateState, formData: FormData): Promise<ActivateState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for") ?? "local";
  if (!throttle(`activate:${ip}`, 10)) return { step: "code", error: t("auth.tooManyAttempts") };
  const db = getDb();
  const code = String(formData.get("code") ?? prev.code ?? "").trim().toUpperCase();
  const check = await checkInvitation(db, code);
  if (!check.ok) return { step: "code", error: t("auth.codeInvalid") };
  if (check.needsGuardianFirst) return { step: "code", error: t("auth.guardianFirst") };
  if (prev.step === "code" || !formData.get("password")) return { step: "credentials", code, role: check.role, name: check.name };
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { ...prev, error: t("auth.passwordShort") };
  if (password !== confirm) return { ...prev, error: t("auth.passwordsMismatch") };
  try {
    const userId = await activateInvitation(db, code, { email: String(formData.get("email") ?? ""), username: String(formData.get("username") ?? ""), password });
    await createSessionCookie(userId);
  } catch (e) {
    const msg = (e as Error).message;
    return { ...prev, error: msg === "taken" ? t("auth.identifierTaken") : msg === "guardianFirst" ? t("auth.guardianFirst") : t("auth.codeInvalid") };
  }
  redirect(check.role === "student" ? "/student" : "/parent");
}
