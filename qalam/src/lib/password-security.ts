import "server-only";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import type { DB } from "@/db";
import { authSessions, users } from "@/db/schema";

export type PasswordChangeError = "invalid" | "length" | "mismatch" | "same";

export async function changeOwnPassword(
  db: DB, userId: string, sessionId: string,
  current: string, next: string, confirmation: string,
): Promise<{ error?: PasswordChangeError }> {
  if ([...next].length < 12 || Buffer.byteLength(next, "utf8") > 72) return { error: "length" };
  if (next !== confirmation) return { error: "mismatch" };
  if (!current || Buffer.byteLength(current, "utf8") > 1024) return { error: "invalid" };
  return db.transaction(async (tx) => {
    // Serialize with login creation: a login checked against an old password
    // must not recreate a session after password-change revocation.
    const [account] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    const session = await tx.query.authSessions.findFirst({ where: and(
      eq(authSessions.id, sessionId), eq(authSessions.userId, userId), gt(authSessions.expiresAt, new Date()),
    ) });
    if (!account || account.status !== "active" || !session || !(await bcrypt.compare(current, account.passwordHash))) {
      return { error: "invalid" as const };
    }
    if (await bcrypt.compare(next, account.passwordHash)) return { error: "same" as const };
    const passwordHash = await bcrypt.hash(next, 12);
    await tx.update(users).set({ passwordHash }).where(eq(users.id, userId));
    await tx.delete(authSessions).where(eq(authSessions.userId, userId));
    return {};
  });
}

export async function createDatabaseSession(db: DB, input: {
  userId: string; token: string; expiresAt: Date; expectedPasswordHash?: string;
}): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [account] = await tx.select().from(users).where(eq(users.id, input.userId)).for("update");
    if (!account || account.status !== "active" ||
        (input.expectedPasswordHash !== undefined && account.passwordHash !== input.expectedPasswordHash)) return false;
    await tx.insert(authSessions).values({ id: input.token, userId: input.userId, expiresAt: input.expiresAt });
    await tx.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, input.userId));
    return true;
  });
}
