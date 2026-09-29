import { afterEach, expect, it, vi } from "vitest";
import { writeFile, readFile, deleteFile } from "@/lib/files";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("uses the private Supabase object API for uploads, downloads and cleanup", async () => {
  vi.stubEnv("SUPABASE_URL", "https://storage-test.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-server-key");
  vi.stubEnv("SUPABASE_STORAGE_BUCKET", "qalam-uploads");
  const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") return new Response(JSON.stringify({ Key: "qalam-uploads/test.pdf" }), { headers: { "Content-Type": "application/json" } });
    if (init?.method === "DELETE") return new Response("[]", { headers: { "Content-Type": "application/json" } });
    return new Response("%PDF-test", { headers: { "Content-Type": "application/pdf" } });
  });
  vi.stubGlobal("fetch", fetcher);
  await writeFile("test.pdf", Buffer.from("%PDF-test"), "application/pdf");
  expect((await readFile("test.pdf")).toString()).toBe("%PDF-test");
  await deleteFile("test.pdf");
  expect(fetcher).toHaveBeenCalledTimes(3);
  const calls = fetcher.mock.calls;
  expect(String(calls[0][0])).toBe("https://storage-test.supabase.co/storage/v1/object/qalam-uploads/test.pdf");
  expect(new Headers(calls[0][1]?.headers).get("apikey")).toBe("test-server-key");
  expect(String(calls[1][0])).toBe("https://storage-test.supabase.co/storage/v1/object/qalam-uploads/test.pdf");
  expect(new Headers(calls[1][1]?.headers).get("apikey")).toBe("test-server-key");
  expect(calls[2][1]?.method).toBe("DELETE");
});
