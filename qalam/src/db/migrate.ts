import { getDb, runMigrations } from "./index";

async function main() {
  const db = getDb("migration");
  await runMigrations(db);
  console.log("Migrations applied.");
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
