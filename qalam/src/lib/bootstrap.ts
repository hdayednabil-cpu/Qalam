import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { tutors, users } from "@/db/schema";
import { hashPassword } from "./auth";

/** Demo logins: on unless explicitly disabled; always off in production unless explicitly enabled. */
export function demoEnabled() {
  const v = process.env.DEMO_LOGINS;
  if (v === "true") return true;
  if (v === "false") return false;
  return process.env.NODE_ENV !== "production";
}

let checked = false;
/**
 * Production bootstrap: with an empty database and TUTOR_EMAIL set, create the
 * tutor account so the owner can sign in without the demo seed.
 */
export async function bootstrapTutor() {
  if (checked) return;
  checked = true;
  const email = process.env.TUTOR_EMAIL?.trim().toLowerCase();
  const password = process.env.TUTOR_INITIAL_PASSWORD;
  if (!email || !password) return;
  const db = getDb();
  const existing = await db.query.users.findFirst({ where: and(eq(users.role, "tutor")) });
  if (existing) return;
  const tutorId = "tutor_main";
  await db.insert(tutors).values({ id: tutorId, name: process.env.TUTOR_NAME ?? "Tutor", invitePrefix: (process.env.TUTOR_NAME ?? "TUT").slice(0, 3).toUpperCase() }).onConflictDoNothing();
  await db.insert(users).values({ id: crypto.randomUUID(), tutorId, role: "tutor", email, passwordHash: await hashPassword(password), displayName: process.env.TUTOR_NAME ?? "Tutor" });
  console.log(`Bootstrapped tutor account for ${email}`);
}
