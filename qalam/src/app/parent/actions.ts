"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CHILD_COOKIE, getViewer, viewerStudents } from "@/lib/auth";

export async function switchChild(fd: FormData) {
  const v = await getViewer("guardian");
  const id = String(fd.get("studentId"));
  const kids = await viewerStudents(v);
  if (kids.some((k) => k.id === id)) (await cookies()).set(CHILD_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(String(fd.get("back") ?? "/parent"));
}
