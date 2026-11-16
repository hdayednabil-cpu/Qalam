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
  await ensurePrivateBucket();
}

// Creates the private upload bucket in the preview project if it does not exist yet.
async function ensurePrivateBucket() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_STORAGE_BUCKET) {
    console.error("Preview database preparation: the preview storage settings are incomplete.");
    process.exit(1);
  }
  if (SUPABASE_URL.includes(PRODUCTION_PROJECT_REF)) {
    console.error("Preview database preparation: the preview storage settings point at the live Qalam project. Stopping.");
    process.exit(1);
  }
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data } = await supabase.storage.getBucket(SUPABASE_STORAGE_BUCKET);
  if (data) {
    if (data.public) {
      console.error("Preview database preparation: the preview upload bucket is public. Make it private before continuing.");
      process.exit(1);
    }
    console.log("Preview upload bucket is ready and private.");
    return;
  }
  const { error } = await supabase.storage.createBucket(SUPABASE_STORAGE_BUCKET, { public: false });
  if (error) {
    console.error("Preview database preparation: could not create the preview upload bucket.");
    process.exit(1);
  }
  console.log("Private preview upload bucket created.");
}
