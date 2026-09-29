import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { signedFileUrl, verifySignature, writeFile, readFile, deleteFile } from "@/lib/files";

afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
function local() {
  vi.stubEnv("NODE_ENV", "test");
  for (const name of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET"]) vi.stubEnv(name, "");
}
describe("signed file access", () => {
  it("rejects tampering, other files, expired links and rotated secrets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T00:00:00Z"));
    vi.stubEnv("AUTH_SECRET", "a".repeat(64));
    const url = new URL(signedFileUrl("file-a", 60), "https://example.test");
    const exp = url.searchParams.get("e"); const sig = url.searchParams.get("s");
    expect(verifySignature("file-a", exp, sig)).toBe(true);
    expect(verifySignature("file-b", exp, sig)).toBe(false);
    expect(verifySignature("file-a", "NaN", sig)).toBe(false);
    expect(verifySignature("file-a", exp, "wrong")).toBe(false);
    vi.stubEnv("AUTH_SECRET", "b".repeat(64));
    expect(verifySignature("file-a", exp, sig)).toBe(false);
    vi.stubEnv("AUTH_SECRET", "a".repeat(64));
    vi.advanceTimersByTime(60000);
    expect(verifySignature("file-a", exp, sig)).toBe(false);
  });
  it("fails closed without a production signing secret", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("AUTH_SECRET", "");
    expect(() => signedFileUrl("file-a")).toThrow("AUTH_SECRET");
  });
});
describe("storage configuration", () => {
  it("round trips local development files and refuses traversal and overwrite", async () => {
    local();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "qalam-files-")); vi.stubEnv("UPLOAD_DIR", dir);
    try {
      await writeFile("example.pdf", Buffer.from("%PDF-test"), "application/pdf");
      expect((await readFile("example.pdf")).toString()).toBe("%PDF-test");
      await expect(writeFile("example.pdf", Buffer.from("replace"), "application/pdf")).rejects.toThrow();
      await expect(readFile("../example.pdf")).rejects.toThrow("Invalid storage key");
      await deleteFile("example.pdf");
      await expect(readFile("example.pdf")).rejects.toThrow();
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
  });
  it("never silently stores production files on temporary disk", async () => {
    local(); vi.stubEnv("NODE_ENV", "production");
    await expect(writeFile("example.pdf", Buffer.from("x"), "application/pdf")).rejects.toThrow("not configured");
    await expect(readFile("example.pdf")).rejects.toThrow("not configured");
  });
  it("rejects incomplete Supabase configuration even in development", async () => {
    local(); vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    await expect(readFile("example.pdf")).rejects.toThrow("not configured");
  });
});
