// Runs before the Vercel build. Stops a deployment whose database setting would
// fail under load, with a message that names the fix and never the secret.
import { runtimeDatabaseUrlProblems } from "./database-config.mjs";

if (process.env.VERCEL !== "1") {
  console.log("Database configuration check runs on Vercel builds only; skipped.");
} else {
  const problems = runtimeDatabaseUrlProblems(process.env.DATABASE_URL);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`Database configuration: ${problem}`);
    process.exit(1);
  }
  console.log("Database configuration check passed.");
}
