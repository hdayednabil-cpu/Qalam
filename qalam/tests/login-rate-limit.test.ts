import { beforeAll, beforeEach, expect, it } from "vitest";
import { createTestDb, runMigrations, type DB } from "@/db";
import { loginRateLimits } from "@/db/schema";
import { consumeLoginAttempt } from "@/lib/login-rate-limit";

let db: DB;

beforeAll(async () => {
  db = await createTestDb();
  await runMigrations(db);
});

beforeEach(async () => {
  await db.delete(loginRateLimits);
});

it("blocks attempts above the shared limit without storing the identifier", async () => {
  const identifier = "student@example.test";
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    expect(await consumeLoginAttempt(db, identifier)).toBe(true);
  }
  expect(await consumeLoginAttempt(db, identifier)).toBe(false);

  const [bucket] = await db.select().from(loginRateLimits);
  expect(bucket.attempts).toBe(9);
  expect(bucket.keyHash).not.toContain(identifier);
});

it("counts concurrent attempts atomically", async () => {
  const decisions = await Promise.all(
    Array.from({ length: 12 }, () => consumeLoginAttempt(db, "concurrent@example.test")),
  );
  expect(decisions.filter(Boolean)).toHaveLength(8);
  expect(decisions.filter((allowed) => !allowed)).toHaveLength(4);
});

it("opens a fresh window after expiry", async () => {
  const start = new Date("2026-10-09T06:00:00Z");
  expect(await consumeLoginAttempt(db, "reset@example.test", 1, 60_000, start)).toBe(true);
  expect(await consumeLoginAttempt(db, "reset@example.test", 1, 60_000, new Date(start.getTime() + 30_000))).toBe(false);
  expect(await consumeLoginAttempt(db, "reset@example.test", 1, 60_000, new Date(start.getTime() + 60_001))).toBe(true);
});
