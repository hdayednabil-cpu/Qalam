import { describe, expect, it } from "vitest";
import { databasePoolOptions } from "@/db/pool-options";

describe("serverless database connection routing", () => {
  const session = "postgresql://postgres.project:encoded%40password@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require";

  it("releases backend sessions between transactions without changing credentials or TLS", () => {
    const options = databasePoolOptions(session, true);
    const before = new URL(session);
    const after = new URL(options.connectionString!);
    expect(after.port).toBe("6543");
    for (const key of ["username", "password", "hostname", "pathname", "search"] as const) expect(after[key]).toBe(before[key]);
    expect(options.max).toBeLessThanOrEqual(2);
    expect(options.idleTimeoutMillis).toBeLessThanOrEqual(1_000);
    expect(options.connectionTimeoutMillis).toBeGreaterThan(0);
  });

  it("keeps migration and local session connections unchanged", () => {
    expect(databasePoolOptions(session, false).connectionString).toBe(session);
  });

  it.each([
    "postgres://user:password@localhost:5432/test",
    "postgres://user:password@db.project.supabase.co:5432/postgres",
    "postgres://user:password@aws-0-eu-west-1.pooler.supabase.com.attacker.test:5432/postgres",
    session.replace(":5432/", ":6543/"),
  ])("does not rewrite other endpoints or existing transaction URLs: %s", (url) => {
    expect(databasePoolOptions(url, true).connectionString).toBe(url);
  });

  it("does not let query-string connection overrides silently retain session mode", () => {
    expect(() => databasePoolOptions(`${session}&port=5432`, true)).toThrow("URL authority");
  });
});
