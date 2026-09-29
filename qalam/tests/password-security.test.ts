import { beforeAll, beforeEach, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { createTestDb, runMigrations, type DB } from "@/db";
import { users, tutors, authSessions } from "@/db/schema";
import { changeOwnPassword, createDatabaseSession } from "@/lib/password-security";

let db: DB;
let oldHash: string;
const oldPassword = "Test-only-old-passphrase";
const newPassword = "Test-only-new-passphrase";
const future = () => new Date(Date.now() + 3600000);
beforeAll(async () => {
  db = await createTestDb();
  await runMigrations(db);
  oldHash = await bcrypt.hash(oldPassword, 4);
  await db.insert(tutors).values({ id: "test-tutor", name: "Test tutor" });
});
beforeEach(async () => {
  await db.delete(authSessions);
  await db.delete(users);
  await db.insert(users).values([
    { id: "self", tutorId: "test-tutor", role: "tutor", displayName: "Test owner", passwordHash: oldHash },
    { id: "other", tutorId: "test-tutor", role: "student", displayName: "Other test account", passwordHash: oldHash },
  ]);
  await db.insert(authSessions).values([
    { id: "self-session", userId: "self", expiresAt: future() },
    { id: "second-device", userId: "self", expiresAt: future() },
    { id: "other-session", userId: "other", expiresAt: future() },
  ]);
});
const change = (current = oldPassword, next = newPassword, confirm = next, session = "self-session") =>
  changeOwnPassword(db, "self", session, current, next, confirm);

it("changes only the signed-in account and revokes all its sessions", async () => {
  expect(await change()).toEqual({});
  const self = (await db.query.users.findFirst({ where: eq(users.id, "self") }))!;
  expect(await bcrypt.compare(newPassword, self.passwordHash)).toBe(true);
  expect(await bcrypt.compare(oldPassword, self.passwordHash)).toBe(false);
  expect((await db.query.authSessions.findMany()).map((s) => s.id)).toEqual(["other-session"]);
  expect((await db.query.users.findFirst({ where: eq(users.id, "other") }))!.passwordHash).toBe(oldHash);
});
it("rejects a wrong current password without changing sessions or credentials", async () => {
  expect(await change("incorrect")).toEqual({ error: "invalid" });
  expect((await db.query.users.findFirst({ where: eq(users.id, "self") }))!.passwordHash).toBe(oldHash);
  expect(await db.query.authSessions.findMany()).toHaveLength(3);
});
it("rejects another account's session and a removed session", async () => {
  expect(await change(oldPassword, newPassword, newPassword, "other-session")).toEqual({ error: "invalid" });
  expect(await change(oldPassword, newPassword, newPassword, "missing")).toEqual({ error: "invalid" });
});
it("rejects expired sessions and deactivated accounts", async () => {
  await db.update(authSessions).set({ expiresAt: new Date(0) }).where(eq(authSessions.id, "self-session"));
  expect(await change()).toEqual({ error: "invalid" });
  await db.update(users).set({ status: "deactivated" }).where(eq(users.id, "self"));
  expect(await change(oldPassword, newPassword, newPassword, "second-device")).toEqual({ error: "invalid" });
});
it("rejects mismatched, unchanged, short and bcrypt-truncated passwords", async () => {
  expect(await change(oldPassword, newPassword, "Different confirmation")).toEqual({ error: "mismatch" });
  expect(await change(oldPassword, oldPassword)).toEqual({ error: "same" });
  expect(await change(oldPassword, "short")).toEqual({ error: "length" });
  expect(await change(oldPassword, "a".repeat(73))).toEqual({ error: "length" });
  expect(await change(oldPassword, "ش".repeat(40))).toEqual({ error: "length" });
});
it("does not create a session for an in-flight login verified against the old hash", async () => {
  await change();
  expect(await createDatabaseSession(db, { userId: "self", token: "stale-login", expiresAt: future(), expectedPasswordHash: oldHash })).toBe(false);
  const self = (await db.query.users.findFirst({ where: eq(users.id, "self") }))!;
  expect(await createDatabaseSession(db, { userId: "self", token: "fresh-login", expiresAt: future(), expectedPasswordHash: self.passwordHash })).toBe(true);
});
it("rolls back the password change if session revocation fails", async () => {
  await db.execute(sql.raw(`CREATE FUNCTION fail_session_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test revocation failure'; END $$`));
  await db.execute(sql.raw(`CREATE TRIGGER test_revoke_failure BEFORE DELETE ON auth_sessions FOR EACH ROW EXECUTE FUNCTION fail_session_delete()`));
  try {
    await expect(change()).rejects.toThrow();
    expect((await db.query.users.findFirst({ where: eq(users.id, "self") }))!.passwordHash).toBe(oldHash);
    expect(await db.query.authSessions.findMany()).toHaveLength(3);
  } finally {
    await db.execute(sql.raw("DROP TRIGGER test_revoke_failure ON auth_sessions"));
    await db.execute(sql.raw("DROP FUNCTION fail_session_delete()"));
  }
});
