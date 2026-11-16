import { describe, expect, it } from "vitest";
import { databasePoolOptions, databaseUrl } from "@/db/pool-options";
// @ts-expect-error plain JavaScript module shared with the Vercel build check
import { runtimeDatabaseUrlProblems } from "../scripts/database-config.mjs";

const sessionPooler = "postgresql://postgres.project:encoded%40password@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require";
const transactionPooler = sessionPooler.replace(":5432/", ":6543/");

describe("database connection settings", () => {
  it("uses each configured connection string exactly as given", () => {
    for (const url of [sessionPooler, transactionPooler, "postgres://user:password@localhost:5432/test"]) {
      expect(databasePoolOptions(url, true).connectionString).toBe(url);
      expect(databasePoolOptions(url, false).connectionString).toBe(url);
    }
  });

  it("keeps serverless pools small and quick to release", () => {
    const options = databasePoolOptions(transactionPooler, true);
    expect(options.max).toBeLessThanOrEqual(2);
    expect(options.idleTimeoutMillis).toBeLessThanOrEqual(1_000);
    expect(options.connectionTimeoutMillis).toBeGreaterThan(0);
  });

  it("uses the migration URL for migrations and the app URL for requests", () => {
    const env = { DATABASE_URL: transactionPooler, MIGRATION_DATABASE_URL: sessionPooler };
    expect(databaseUrl("runtime", env)).toBe(transactionPooler);
    expect(databaseUrl("migration", env)).toBe(sessionPooler);
  });

  it("falls back to the app URL for migrations, and to the embedded database when nothing is set", () => {
    expect(databaseUrl("migration", { DATABASE_URL: transactionPooler })).toBe(transactionPooler);
    expect(databaseUrl("runtime", { DATABASE_URL: "  " })).toBeUndefined();
    expect(databaseUrl("migration", {})).toBeUndefined();
  });
});

describe("Vercel build check for the app's database URL", () => {
  it("accepts the transaction pooler, other hosts and an unset URL", () => {
    expect(runtimeDatabaseUrlProblems(transactionPooler)).toEqual([]);
    expect(runtimeDatabaseUrlProblems("postgres://user:password@db.project.supabase.co:5432/postgres")).toEqual([]);
    expect(runtimeDatabaseUrlProblems("postgres://user:password@aws-0-eu-west-1.pooler.supabase.com.attacker.test:5432/postgres")).toEqual([]);
    expect(runtimeDatabaseUrlProblems(undefined)).toEqual([]);
  });

  it("rejects the session pooler, with or without an explicit port", () => {
    expect(runtimeDatabaseUrlProblems(sessionPooler)).toHaveLength(1);
    expect(runtimeDatabaseUrlProblems(sessionPooler.replace(":5432", ""))).toHaveLength(1);
  });

  it("rejects host or port overrides in query parameters", () => {
    expect(runtimeDatabaseUrlProblems(`${transactionPooler}&port=5432`).length).toBeGreaterThan(0);
  });

  it("never repeats the connection string, which contains the password", () => {
    const messages = [...runtimeDatabaseUrlProblems(sessionPooler), ...runtimeDatabaseUrlProblems(`${transactionPooler}&port=5432`), ...runtimeDatabaseUrlProblems("not a url")];
    for (const message of messages) expect(message).not.toContain("encoded%40password");
    expect(runtimeDatabaseUrlProblems("not a url")).toHaveLength(1);
  });
});
