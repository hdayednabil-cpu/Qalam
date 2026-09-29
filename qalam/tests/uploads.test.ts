import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ user: vi.fn(), homework: vi.fn(), insert: vi.fn(), write: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/db", () => ({ getDb: () => ({ query: { homework: { findFirst: mocks.homework } }, insert: () => ({ values: mocks.insert }) }) }));
vi.mock("@/lib/files", () => ({ writeFile: mocks.write, deleteFile: mocks.remove }));
import { POST } from "@/app/api/uploads/route";
function request(homeworkId = "hw", bytes = "%PDF-test", type = "application/pdf") {
  const form = new FormData();
  form.set("homeworkId", homeworkId);
  form.set("file", new File([bytes], "test.pdf", { type }));
  return new NextRequest("https://qalam.example/api/uploads", { method: "POST", body: form });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "user", role: "student", tutorId: "tutor", studentId: "student" });
  mocks.homework.mockResolvedValue({ id: "hw", tutorId: "tutor", studentId: "student", status: "assigned" });
});
describe("upload authorization and persistence", () => {
  it("denies signed-out users and guardians", async () => {
    mocks.user.mockResolvedValueOnce(null);
    expect((await POST(request())).status).toBe(401);
    mocks.user.mockResolvedValueOnce({ role: "guardian" });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("requires homework and rejects other students and tutors", async () => {
    expect((await POST(request(""))).status).toBe(400);
    mocks.homework.mockResolvedValueOnce({ tutorId: "tutor", studentId: "other", status: "assigned" });
    expect((await POST(request())).status).toBe(403);
    mocks.user.mockResolvedValueOnce({ role: "tutor", tutorId: "other" });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("rejects closed homework and incorrectly labelled PDFs", async () => {
    mocks.homework.mockResolvedValueOnce({ tutorId: "tutor", studentId: "student", status: "reviewed" });
    expect((await POST(request())).status).toBe(409);
    expect((await POST(request("hw", "<html>"))).status).toBe(422);
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("rejects oversized payloads before storing them", async () => {
    expect((await POST(request("hw", "x".repeat(4 * 1024 * 1024 + 1)))).status).toBe(413);
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("stores a valid upload before returning the file identifier", async () => {
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ fileId: expect.any(String), mimeType: "application/pdf" });
    expect(mocks.write).toHaveBeenCalledWith(expect.stringMatching(/\.pdf$/), Buffer.from("%PDF-test"), "application/pdf");
    expect(mocks.insert).toHaveBeenCalledOnce();
  });
  it("normalizes an image with the patched image library", async () => {
    const sharp = (await import("sharp")).default;
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "white" } }).png().toBuffer();
    const form = new FormData();
    form.set("homeworkId", "hw");
    form.set("file", new File([new Uint8Array(png)], "test.png", { type: "image/png" }));
    const response = await POST(new NextRequest("https://qalam.example/api/uploads", { method: "POST", body: form }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ mimeType: "image/jpeg", width: 8, height: 8 });
    expect(mocks.write.mock.calls[0][1].subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
  });
  it("does not create a file record after storage failure, and cleans up after database failure", async () => {
    mocks.write.mockRejectedValueOnce(new Error("private backend detail"));
    const res = await POST(request());
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("private backend detail");
    expect(mocks.insert).not.toHaveBeenCalled();
    mocks.insert.mockRejectedValueOnce(new Error("db unavailable"));
    expect((await POST(request())).status).toBe(503);
    expect(mocks.remove).toHaveBeenCalledOnce();
  });
});
