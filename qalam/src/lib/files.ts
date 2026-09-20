import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => process.env.AUTH_SECRET ?? "dev-secret-change-me";
export const uploadDir = () => process.env.UPLOAD_DIR ?? "./data/uploads";

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_PAGES = 20;
export const ACCEPTED = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "application/pdf"];

/** Short-lived signed URL: the URL itself is the capability, like S3/Supabase signed URLs. */
export function signedFileUrl(fileId: string, ttlSeconds = 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = createHmac("sha256", secret()).update(`${fileId}:${exp}`).digest("base64url");
  return `/api/files/${fileId}?e=${exp}&s=${sig}`;
}

export function verifySignature(fileId: string, exp: string | null, sig: string | null) {
  if (!exp || !sig) return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac("sha256", secret()).update(`${fileId}:${exp}`).digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function storagePath(key: string) {
  const dir = uploadDir();
  fs.mkdirSync(dir, { recursive: true });
  const safe = path.basename(key);
  return path.join(dir, safe);
}

export function writeFile(key: string, data: Buffer) {
  fs.writeFileSync(storagePath(key), data);
}
export function readFile(key: string) {
  return fs.readFileSync(storagePath(key));
}
