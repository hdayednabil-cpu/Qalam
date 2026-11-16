import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import type { DB } from "@/db";
import { loginRateLimits } from "@/db/schema";

const DEFAULT_WINDOW_MS = 10 * 60 * 1000;

/**
 * Atomically consumes one login attempt in shared database state.
 * This remains effective across server instances and deployments.
 */
export async function consumeLoginAttempt(
  db: DB,
  identifier: string,
  max = 8,
  windowMs = DEFAULT_WINDOW_MS,
  now = new Date(),
): Promise<boolean> {
  const keyHash = createHash("sha256").update(`login:${identifier}`).digest("hex");
  const expiresAt = new Date(now.getTime() + windowMs);

  // Keep cleanup bounded so arbitrary identifiers cannot grow the table forever
  // or turn one login request into an unbounded delete.
  await db.execute(sql`
    WITH expired AS (
      SELECT key_hash FROM ${loginRateLimits}
      WHERE ${loginRateLimits.expiresAt} <= ${now}
      LIMIT 100
    )
    DELETE FROM ${loginRateLimits}
    USING expired
    WHERE ${loginRateLimits.keyHash} = expired.key_hash
      AND ${loginRateLimits.expiresAt} <= ${now}
  `);

  const [bucket] = await db
    .insert(loginRateLimits)
    .values({ keyHash, attempts: 1, expiresAt })
    .onConflictDoUpdate({
      target: loginRateLimits.keyHash,
      set: {
        attempts: sql`CASE
          WHEN ${loginRateLimits.expiresAt} <= ${now} THEN 1
          ELSE ${loginRateLimits.attempts} + 1
        END`,
        expiresAt: sql`CASE
          WHEN ${loginRateLimits.expiresAt} <= ${now} THEN ${expiresAt}
          ELSE ${loginRateLimits.expiresAt}
        END`,
      },
    })
    .returning({ attempts: loginRateLimits.attempts });

  return bucket.attempts <= max;
}
