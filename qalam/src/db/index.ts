import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

// One database client per process. In development Next.js hot-reloads modules,
// so the instance is parked on globalThis to avoid opening PGlite twice.
const g = globalThis as unknown as { __qalamDb?: DB; __qalamPglite?: import("@electric-sql/pglite").PGlite };

export function getDb(): DB {
  if (g.__qalamDb) return g.__qalamDb;
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    // Postgres / Supabase. `pg` is a CommonJS module; require keeps it off the bundle.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg") as typeof import("pg");
    const pool = new Pool({ connectionString: url, max: 5 });
    g.__qalamDb = drizzlePg(pool, { schema }) as unknown as DB;
  } else {
    // Embedded Postgres (PGlite) persisted under ./data/pg — zero setup.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PGlite } = require("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
    const dataDir = process.env.PGLITE_DIR ?? "./data/pg";
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require("node:fs") as typeof import("node:fs")).mkdirSync(dataDir, { recursive: true });
    const client = new PGlite(dataDir);
    g.__qalamPglite = client;
    g.__qalamDb = drizzlePglite(client, { schema }) as unknown as DB;
  }
  return g.__qalamDb;
}

/** In-memory database for tests. */
export async function createTestDb(): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const client = new PGlite();
  return drizzlePglite(client, { schema }) as unknown as DB;
}

export async function runMigrations(db: DB) {
  const folder = "./drizzle";
  if (process.env.DATABASE_URL?.trim()) {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(db as never, { migrationsFolder: folder });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as never, { migrationsFolder: folder });
  }
}

export { schema };
