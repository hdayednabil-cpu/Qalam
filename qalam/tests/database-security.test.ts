import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";

it("keeps server access while denying browser roles access to application tables", async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; GRANT USAGE ON SCHEMA public TO anon, authenticated;');
    await db.exec(fs.readFileSync("drizzle/0000_init.sql", "utf8"));
    await db.exec('GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;');
    const migration = fs.readFileSync("drizzle/0001_server_only_database.sql", "utf8");
    await db.exec(migration);
    await db.exec(migration); // Safe if applied live before Drizzle records it.
    const { rows } = await db.query<{ count: number }>("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity");
    expect(rows[0].count).toBe(0);
    await db.exec("INSERT INTO tutors (id, name) VALUES ('security-test', 'Test'); CREATE TABLE public.future_security_test (id text);");
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`SET ROLE ${role}`);
      for (const table of ["users", "auth_sessions", "students", "tutors", "future_security_test"]) {
        await expect(db.query(`SELECT * FROM public.${table}`)).rejects.toThrow(/permission denied/);
      }
      await expect(db.exec("DELETE FROM public.tutors")).rejects.toThrow(/permission denied/);
      await db.exec("RESET ROLE");
    }
    expect((await db.query("SELECT id FROM public.tutors")).rows).toEqual([{ id: "security-test" }]);
  } finally {
    await db.close();
  }
});
