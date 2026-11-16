import type { PoolConfig } from "pg";

export type DatabasePurpose = "runtime" | "migration";

/**
 * The connection string for each purpose, taken as configured and never rewritten.
 * Runtime requests use DATABASE_URL (on Vercel: Supabase's transaction pooler, port 6543).
 * Migrations use MIGRATION_DATABASE_URL when set (a session pooler or direct connection),
 * otherwise DATABASE_URL.
 */
export function databaseUrl(purpose: DatabasePurpose, env: Record<string, string | undefined> = process.env): string | undefined {
  const runtime = env.DATABASE_URL?.trim() || undefined;
  if (purpose === "migration") return env.MIGRATION_DATABASE_URL?.trim() || runtime;
  return runtime;
}

/** Small pools on serverless so each function instance holds few connections. */
export function databasePoolOptions(connectionString: string, serverless: boolean): PoolConfig {
  return {
    connectionString,
    max: serverless ? 2 : 5,
    idleTimeoutMillis: serverless ? 1_000 : 10_000,
    connectionTimeoutMillis: 10_000,
    application_name: "qalam",
  };
}
