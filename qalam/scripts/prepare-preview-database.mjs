// Runs before Vercel preview builds. When previews have their own database
// (PREVIEW_DATABASE_ISOLATED=true, set for the Preview environment only), this
// applies migrations to that database and fills it with the demo families if it
// is empty, so every preview has sample data and demo logins.
//
// It refuses to run against the live Qalam database, and never prints a connection string.
import { spawnSync } from "node:child_process";

// The live Supabase project. A preview must never migrate or seed it.
const PRODUCTION_PROJECT_REF = "xzswscpdceaovutpkwva";

function run(args) {
  const result = spawnSync("npx", args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.VERCEL_ENV !== "preview" || process.env.PREVIEW_DATABASE_ISOLATED !== "true") {
  console.log("Preview database preparation runs only on previews with their own database; skipped.");
} else {
  const urls = [process.env.DATABASE_URL, process.env.MIGRATION_DATABASE_URL].filter(Boolean);
  if (urls.length === 0) {
    console.error("Preview database preparation: DATABASE_URL is not set for previews.");
    process.exit(1);
  }
  if (urls.some((url) => url.includes(PRODUCTION_PROJECT_REF))) {
    console.error("Preview database preparation: the preview settings point at the live Qalam database. Stopping without changes.");
    process.exit(1);
  }
  run(["tsx", "src/db/migrate.ts"]);
  run(["tsx", "src/db/seed-if-empty.ts"]);
}
