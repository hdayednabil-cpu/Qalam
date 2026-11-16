// Fills a migrated, empty database with the demo families. Does nothing if any
// account already exists, so it is safe to run on every preview build.
import { getDb } from "./index";
import { seed } from "./seed";
import * as s from "./schema";

async function main() {
  const db = getDb();
  const existing = await db.select({ id: s.users.id }).from(s.users).limit(1);
  if (existing.length > 0) {
    console.log("Database already has accounts; demo data not added.");
  } else {
    await seed(db);
    console.log("Demo data added.");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Seeding failed.");
  process.exit(1);
});
