import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { CHILD_COOKIE, getViewer, viewerStudents, type Viewer } from "@/lib/auth";
import { getWorkspace, studentName } from "@/lib/queries";

/** The guardian's selected child (cookie), defaulting to the first. */
export async function currentChild() {
  const v: Viewer = await getViewer("guardian");
  const kids = await viewerStudents(v);
  if (!kids.length) redirect("/login");
  const want = (await cookies()).get(CHILD_COOKIE)?.value;
  const child = kids.find((k) => k.id === want) ?? kids[0];
  const ws = await getWorkspace(getDb(), v.user, child.id);
  return { v, kids: kids.map((k) => ({ id: k.id, name: studentName(k), hue: k.avatarHue, grade: k.gradeYear })), child, ws };
}
