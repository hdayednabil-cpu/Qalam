import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (value && value.length >= 32 && value !== "dev-secret-change-me") return value;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must contain at least 32 characters");
  return value ?? "dev-secret-change-me";
}

function bucket() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const name = process.env.SUPABASE_STORAGE_BUCKET;
  if (url && key && name) {
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }).storage.from(name);
  }
  if (url || key || name || process.env.NODE_ENV === "production") throw new Error("Supabase file storage is not configured");
  return null;
}

export const uploadDir = () => process.env.UPLOAD_DIR ?? "./data/uploads";
function storagePath(key: string) {
  if (!key || path.basename(key) !== key || key === "." || key === "..") throw new Error("Invalid storage key");
  return path.join(uploadDir(), key);
}

/** A short-lived signed URL grants access to one file. */
export function signedFileUrl(fileId: string, ttlSeconds = 3600) {
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) throw new Error("Invalid file link lifetime");
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = createHmac("sha256", secret()).update(`${fileId}:${exp}`).digest("base64url");
  return `/api/files/${encodeURIComponent(fileId)}?e=${exp}&s=${sig}`;
}

export function verifySignature(fileId: string, exp: string | null, sig: string | null) {
  if (!exp || !sig || !/^\d+$/.test(exp) || !Number.isSafeInteger(Number(exp))) return false;
  if (Number(exp) <= Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac("sha256", secret()).update(`${fileId}:${exp}`).digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function writeFile(key: string, data: Buffer, contentType: string) {
  const localPath = storagePath(key);
  const remote = bucket();
  if (remote) {
    const { error } = await remote.upload(key, data, { contentType, upsert: false });
    if (error) throw new Error("File storage upload failed");
    return;
  }
  await fs.mkdir(uploadDir(), { recursive: true });
  await fs.writeFile(localPath, data, { flag: "wx" });
}

export async function readFile(key: string) {
  const localPath = storagePath(key);
  const remote = bucket();
  if (remote) {
    const { data, error } = await remote.download(key);
    if (error || !data) throw new Error("File storage download failed");
    return Buffer.from(await data.arrayBuffer());
  }
  return fs.readFile(localPath);
}

export async function deleteFile(key: string) {
  const localPath = storagePath(key);
  const remote = bucket();
  if (remote) {
    const { error } = await remote.remove([key]);
    if (error) throw new Error("File storage cleanup failed");
    return;
  }
  await fs.rm(localPath, { force: true });
}
