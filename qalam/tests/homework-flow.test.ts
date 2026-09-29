import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import type { DB } from "@/db";

// Only the request cookie jar, Next cache invalidation and database location
// are adapted. Authentication, queries, mutations and storage code are real.
const state = vi.hoisted(() => ({ db: null as DB | null, cookies: new Map<string, string>() }));
vi.mock("@/db", async (original) => ({ ...await original<typeof import("@/db")>(), getDb: () => state.db! }));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: (name: string) => state.cookies.has(name) ? { value: state.cookies.get(name)! } : undefined,
  set: (name: string, value: string) => { state.cookies.set(name, value); },
  delete: (name: string) => { state.cookies.delete(name); },
}) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { createTestDb, runMigrations } from "@/db";
import { seed } from "@/db/seed";
import { homework } from "@/db/schema";
import { login, logout } from "@/app/login/actions";
import { getCurrentUser } from "@/lib/auth";
import { getHomeworkDetail } from "@/lib/queries";
import { submitHomeworkAction } from "@/app/student/actions";
import { POST } from "@/app/api/uploads/route";
import { GET } from "@/app/api/files/[id]/route";
import { signedFileUrl } from "@/lib/files";

let directory: string;
beforeAll(async () => {
  vi.stubEnv("NODE_ENV", "test");
  directory = await mkdtemp(path.join(os.tmpdir(), "qalam-flow-"));
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("SUPABASE_STORAGE_BUCKET", "");
  vi.stubEnv("UPLOAD_DIR", directory);
  vi.stubEnv("AUTH_SECRET", "synthetic-test-signing-secret-not-for-production");
  state.db = await createTestDb();
  await runMigrations(state.db);
  await seed(state.db);
});
afterAll(async () => { vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });

async function signIn(identifier: string, destination: string) {
  state.cookies.clear();
  const form = new FormData();
  form.set("identifier", identifier);
  form.set("password", "demo1234"); // Synthetic fixture credentials only.
  try { await login({}, form); throw new Error("Expected successful login redirect"); }
  catch (error) { expect(String((error as { digest?: string }).digest)).toContain(`;${destination};`); }
  const user = await getCurrentUser();
  expect(user).not.toBeNull();
  return user!;
}
function upload(homeworkId: string) {
  const data = new FormData();
  data.set("homeworkId", homeworkId);
  data.set("file", new File(["%PDF-1.4\nSynthetic homework\n%%EOF"], "homework.pdf", { type: "application/pdf" }));
  return POST(new NextRequest("https://qalam.test/api/uploads", { method: "POST", body: data }));
}

it("signs in student, parent and tutor accounts and completes a persisted homework submission", async () => {
  const student = await signIn("daniel", "/student");
  const hw = (await state.db!.query.homework.findFirst({ where: and(eq(homework.studentId, student.studentId!), eq(homework.status, "assigned")) }))!;
  const uploaded = await upload(hw.id);
  expect(uploaded.status).toBe(200);
  const { fileId } = await uploaded.json();
  expect(await submitHomeworkAction(hw.id, [fileId], "Synthetic submission")).toEqual({ ok: true });

  // A fresh sign-in reloads the submission and retrieves the persisted bytes.
  const refreshedStudent = await signIn("daniel", "/student");
  const detail = await getHomeworkDetail(state.db!, refreshedStudent, hw.id);
  expect(detail!.view.status).toBe("submitted");
  expect(detail!.homework.submissions[0].pages[0].file.id).toBe(fileId);
  const signed = signedFileUrl(fileId);
  const downloaded = await GET(new NextRequest(new URL(signed, "https://qalam.test")), { params: Promise.resolve({ id: fileId }) });
  expect(downloaded.status).toBe(200);
  expect(await downloaded.text()).toBe("%PDF-1.4\nSynthetic homework\n%%EOF");
  expect(downloaded.headers.get("cache-control")).toBe("private, no-store");
  expect(downloaded.headers.get("x-content-type-options")).toBe("nosniff");
  expect((await GET(new NextRequest(`https://qalam.test/api/files/${fileId}`), { params: Promise.resolve({ id: fileId }) })).status).toBe(403);

  const parent = await signIn("sarah.cooper@example.com", "/parent");
  expect((await getHomeworkDetail(state.db!, parent, hw.id))!.view.status).toBe("submitted");
  expect((await upload(hw.id)).status).toBe(403);
  const otherParent = await signIn("ahmed@qalam.demo", "/parent");
  expect(await getHomeworkDetail(state.db!, otherParent, hw.id)).toBeNull();
  const otherStudent = await signIn("chris", "/student");
  expect(await getHomeworkDetail(state.db!, otherStudent, hw.id)).toBeNull();
  expect((await upload(hw.id)).status).toBe(403);
  expect((await submitHomeworkAction(hw.id, [fileId], "Forbidden")).ok).toBe(false);
  const tutor = await signIn("nabil@qalam.demo", "/tutor");
  expect((await getHomeworkDetail(state.db!, tutor, hw.id))!.homework.submissions[0].pages[0].file.id).toBe(fileId);
  try { await logout(); } catch (error) { expect(String((error as { digest?: string }).digest)).toContain(";/login;"); }
  expect(await getCurrentUser()).toBeNull();
  expect((await upload(hw.id)).status).toBe(401);
});
