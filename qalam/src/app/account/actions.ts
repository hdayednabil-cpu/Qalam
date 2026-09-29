"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { requireUser, SESSION_COOKIE, VIEW_AS_COOKIE, CHILD_COOKIE, throttle } from "@/lib/auth";
import { changeOwnPassword } from "@/lib/password-security";

export async function changePassword(_previous: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!throttle(`password-change:${user.id}`, 5)) return { error: "throttled" };
  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE)?.value;
  if (!session) redirect("/login");
  let result: { error?: string };
  try {
    result = await changeOwnPassword(getDb(), user.id, session,
      String(formData.get("currentPassword") ?? ""),
      String(formData.get("newPassword") ?? ""),
      String(formData.get("confirmPassword") ?? ""));
  } catch {
    // Never return or log credentials or database error details.
    return { error: "unavailable" };
  }
  if (result.error) return result;
  jar.delete(SESSION_COOKIE);
  jar.delete(VIEW_AS_COOKIE);
  jar.delete(CHILD_COOKIE);
  redirect("/login?passwordChanged=1");
}
