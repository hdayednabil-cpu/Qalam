import { spawnSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "preview") {
  console.log("Live storage verification is preview-only; skipped.");
} else {
  for (const script of ["test:flow", "test:storage:live"]) {
    const result = spawnSync("npm", ["run", script], {
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "production" },
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
