import type { PoolConfig } from "pg";

/** Keep migration sessions intact; use shared transaction pooling for Vercel requests. */
export function databasePoolOptions(connectionString: string, serverless: boolean): PoolConfig {
  let runtimeUrl = connectionString;
  if (serverless) {
    const url = new URL(connectionString);
    // Only the documented Supabase shared pooler endpoint has this port mapping.
    // Preserve credentials, database, TLS and other query parameters verbatim via URL.
    if (/^aws-[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname) && (!url.port || url.port === "5432")) {
      if (url.searchParams.has("host") || url.searchParams.has("port")) {
        throw new Error("Configure the database pooler host and port in the URL authority, not query parameters.");
      }
      url.port = "6543";
      runtimeUrl = url.toString();
    }
  }
  return {
    connectionString: runtimeUrl,
    max: serverless ? 2 : 5,
    idleTimeoutMillis: serverless ? 1_000 : 10_000,
    connectionTimeoutMillis: 10_000,
    application_name: "qalam",
  };
}
