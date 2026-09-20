"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { requireUser } from "@/lib/auth";
import { markInProgress, submitHomework } from "@/lib/mutations";

export async function submitHomeworkAction(homeworkId: string, fileIds: string[], comment: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser("student");
  try {
    await submitHomework(getDb(), user, homeworkId, fileIds, comment);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  revalidatePath("/student");
  revalidatePath("/tutor");
  return { ok: true };
}

export async function startHomeworkAction(fd: FormData) {
  const user = await requireUser("student");
  await markInProgress(getDb(), user, String(fd.get("homeworkId")));
  revalidatePath("/student");
}
