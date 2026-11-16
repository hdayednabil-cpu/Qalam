// Shared rules for Qalam's database connection settings.
// Used by the Vercel build check (scripts/check-database-config.mjs) and by tests.
// Never log a connection string: it contains the database password.

const SUPABASE_SHARED_POOLER = /^aws-[a-z0-9-]+\.pooler\.supabase\.com$/;

/**
 * Checks the connection string the app uses for requests on Vercel.
 * Serverless functions must use Supabase's transaction pooler (port 6543);
 * the session pooler (port 5432) runs out of connections under load.
 * Returns a list of problems, empty when the setting is acceptable.
 */
export function runtimeDatabaseUrlProblems(connectionString) {
  if (!connectionString || !connectionString.trim()) return [];
  let url;
  try {
    url = new URL(connectionString.trim());
  } catch {
    return ["DATABASE_URL is not a valid connection URL."];
  }
  const problems = [];
  if (url.searchParams.has("host") || url.searchParams.has("port")) {
    problems.push("DATABASE_URL sets host or port in query parameters. Put them in the address itself.");
  }
  if (SUPABASE_SHARED_POOLER.test(url.hostname) && url.port !== "6543") {
    problems.push(
      "DATABASE_URL uses the Supabase session pooler. On Vercel it must use the transaction pooler (port 6543). " +
        "Put a session pooler or direct connection in MIGRATION_DATABASE_URL instead.",
    );
  }
  return problems;
}
