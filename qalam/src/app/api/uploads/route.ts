import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { files, homework } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ACCEPTED, MAX_FILE_BYTES, writeFile } from "@/lib/files";
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
  const form = await req.formData();
  const file = form.get("file");
  const homeworkId = String(form.get("homeworkId") ?? "");
  if (!(file instanceof File)) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "too large" }, { status: 413 });
  const db = getDb();
  if (homeworkId) {
    const h = await db.query.homework.findFirst({ where: eq(homework.id, homeworkId) });
    if (!h) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (user.role === "student" && user.studentId !== h.studentId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (user.role === "guardian") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const type = file.type || "application/octet-stream";
  if (!ACCEPTED.includes(type) && !/^image\//.test(type)) return NextResponse.json({ error: "unsupported" }, { status: 415 });
  const input = Buffer.from(await file.arrayBuffer());
  const id = newId();
  let out: Buffer = input,
    mime = type,
    width: number | null = null,
    height: number | null = null,
    key = `${id}.pdf`;
  if (type !== "application/pdf") {
    try {
      const sharp = (await import("sharp")).default;
      const img = sharp(input, { failOn: "none" }).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true });
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
  writeFile(key, out);
  await db.insert(files).values({ id, tutorId: user.tutorId, storageKey: key, mimeType: mime, sizeBytes: out.length, originalName: file.name, width, height, uploadedByUserId: user.id });
  return NextResponse.json({ fileId: id, mimeType: mime, width, height });
}
