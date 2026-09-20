import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { exportStudent } from "@/lib/mutations";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorised", { status: 401 });
  const { id } = await ctx.params;
  try {
    const data = await exportStudent(getDb(), user, id);
    return NextResponse.json(data, { headers: { "Content-Disposition": `attachment; filename="student-${id}.json"` } });
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }
}
