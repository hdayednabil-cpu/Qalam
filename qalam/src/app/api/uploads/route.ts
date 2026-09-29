import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { files, homework } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { writeFile, deleteFile } from "@/lib/files";
import { ACCEPTED, MAX_FILE_BYTES } from "@/lib/upload-limits";
import { newId } from "@/lib/ids";

export const dynamic = "force-dynamic";

/**
 * Multipart upload of a homework page (image or PDF). Images are auto-rotated
 * (EXIF), downscaled to 2000px and re-encoded as JPEG so every page is a
 * predictable, review-friendly size. HEIC is converted on the client first.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (user.role === "guardian") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "invalid form" }, { status: 400 }); }
  const file = form.get("file");
  const homeworkId = String(form.get("homeworkId") ?? "");
  if (!(file instanceof File)) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "too large" }, { status: 413 });
  const db = getDb();
  if (!homeworkId) return NextResponse.json({ error: "homework required" }, { status: 400 });
  {
    const h = await db.query.homework.findFirst({ where: eq(homework.id, homeworkId) });
    if (!h) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (user.role === "student" && user.studentId !== h.studentId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (user.tutorId !== h.tutorId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!["assigned", "in_progress", "corrections_requested"].includes(h.status)) return NextResponse.json({ error: "homework closed" }, { status: 409 });
  }
  const type = file.type || "application/octet-stream";
  if (!ACCEPTED.includes(type)) return NextResponse.json({ error: "unsupported" }, { status: 415 });
  const input = Buffer.from(await file.arrayBuffer());
  if (type === "application/pdf" && input.subarray(0, 5).toString() !== "%PDF-") return NextResponse.json({ error: "invalid PDF" }, { status: 422 });
  const id = newId();
  let out: Buffer = input,
    mime = type,
    width: number | null = null,
    height: number | null = null,
    key = `${id}.pdf`;
  if (type !== "application/pdf") {
    try {
      const sharp = (await import("sharp")).default;
      const img = sharp(input, { failOn: "error", limitInputPixels: 40_000_000 }).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true });
      const { data, info } = await img.toBuffer({ resolveWithObject: true });
      out = data;
      mime = "image/jpeg";
      width = info.width;
      height = info.height;
      key = `${id}.jpg`;
    } catch {
      return NextResponse.json({ error: "unprocessable" }, { status: 422 });
    }
  }
  if (out.length > MAX_FILE_BYTES) return NextResponse.json({ error: "too large" }, { status: 413 });
  try {
    await writeFile(key, out, mime);
  } catch {
    return NextResponse.json({ error: "File storage unavailable. Please try again." }, { status: 503 });
  }
  try {
    await db.insert(files).values({ id, tutorId: user.tutorId, storageKey: key, mimeType: mime, sizeBytes: out.length, originalName: file.name, width, height, uploadedByUserId: user.id });
  } catch {
    try { await deleteFile(key); } catch { console.error("Upload cleanup failed", id); }
    return NextResponse.json({ error: "Could not save upload. Please try again." }, { status: 503 });
  }
  return NextResponse.json({ fileId: id, mimeType: mime, width, height });
}
