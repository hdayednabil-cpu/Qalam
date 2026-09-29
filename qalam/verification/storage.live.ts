import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";
import { writeFile, readFile, deleteFile, signedFileUrl, verifySignature } from "../src/lib/files";

// Explicitly invoked in Vercel previews. No application records or user files
// are touched. Each run owns exactly one random, disposable object.
it("uploads, reads and removes a private object using the deployed storage configuration", async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!url || !key || !bucket) throw new Error("Missing server storage configuration");
  if (!key.startsWith("sb_secret_")) throw new Error("Expected the rotated Supabase secret key");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const info = await client.storage.getBucket(bucket);
  if (info.error || !info.data) throw new Error("Cannot inspect configured bucket");
  expect(info.data.public, "The upload bucket must be private").toBe(false);

  const object = `qalam-storage-check-${randomUUID()}.pdf`;
  const payload = Buffer.from("%PDF-1.4\n% Qalam synthetic storage verification only\n%%EOF\n");
  let uploaded = false;
  try {
    await writeFile(object, payload, "application/pdf");
    uploaded = true;
    expect((await readFile(object)).equals(payload), "Stored bytes must match").toBe(true);
    const publicUrl = client.storage.from(bucket).getPublicUrl(object).data.publicUrl;
    const publicRead = await fetch(publicUrl, { signal: AbortSignal.timeout(15000) });
    expect([400, 401, 403, 404], "Unsigned public access must be denied").toContain(publicRead.status);
    await publicRead.body?.cancel();

    const link = new URL(signedFileUrl("synthetic-file-id", 60), "https://qalam.invalid");
    expect(verifySignature("synthetic-file-id", link.searchParams.get("e"), link.searchParams.get("s"))).toBe(true);
    expect(verifySignature("different-file-id", link.searchParams.get("e"), link.searchParams.get("s"))).toBe(false);
  } finally {
    if (uploaded) await deleteFile(object);
  }
  const removed = await client.storage.from(bucket).download(object);
  if (!removed.error || String(removed.error.statusCode) !== "404") {
    throw new Error("Could not confirm synthetic object removal");
  }
}, 90000);
