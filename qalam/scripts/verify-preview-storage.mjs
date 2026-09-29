import { spawnSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "preview") {
  console.log("Live storage verification is preview-only; skipped.");
} else {
  const result = spawnSync("npm", ["run", "test:storage:live"], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });
  process.exit(result.status ?? 1);
}
