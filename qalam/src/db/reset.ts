// Drops the local PGlite database (or truncates a Postgres one), migrates and seeds.
import fs from "node:fs";
import { getDb, runMigrations } from "./index";
import { sql } from "drizzle-orm";
import { seed } from "./seed";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    fs.rmSync(process.env.PGLITE_DIR ?? "./data/pg", { recursive: true, force: true });
    fs.rmSync(process.env.UPLOAD_DIR ?? "./data/uploads", { recursive: true, force: true });
  } else {
    const db = getDb();
    await db.execute(sql`drop schema if exists public cascade; create schema public; drop schema if exists drizzle cascade;`);
  }
  const db = getDb();
  await runMigrations(db);
  await seed(db);
  console.log("Database reset, migrated and seeded.");
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
