import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { files } from "@/db/schema";
import { readFile, verifySignature } from "@/lib/files";

export const dynamic = "force-dynamic";

/** Serves a stored file when the URL carries a valid, unexpired signature. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  if (!verifySignature(id, url.searchParams.get("e"), url.searchParams.get("s"))) return new NextResponse("Forbidden", { status: 403 });
  const f = await getDb().query.files.findFirst({ where: eq(files.id, id) });
  if (!f) return new NextResponse("Not found", { status: 404 });
  try {
    const buf = readFile(f.storageKey);
    const name = f.originalName ?? f.storageKey;
    const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": f.mimeType, "Cache-Control": "private, max-age=3600", "Content-Disposition": `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}` },
    });
  } catch (e) {
    console.error("file route: cannot read", f.storageKey, (e as Error).message);
    return new NextResponse("Missing file", { status: 404 });
  }
}
