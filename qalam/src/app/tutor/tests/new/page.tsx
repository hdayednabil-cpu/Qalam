import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as sch from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getWorkspace, listStudents } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { addDaysKey, todayKey } from "@/lib/dates";
import { Card, Field, PageHeader } from "@/components/ui";
import { createAssessmentAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NewTestPage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const { student } = await searchParams;
  const user = await requireUser("tutor");
  const db = getDb();
  if (!student) {
    const students = await listStudents(db, user);
    redirect(students[0] ? `/tutor/tests/new?student=${students[0].id}` : "/tutor/students");
  }
  const ws = await getWorkspace(db, user, student);
  const students = await listStudents(db, user);
  const subjects = await db.query.subjects.findMany({ where: eq(sch.subjects.tutorId, user.tutorId) });
  return (
    <div className="max-w-2xl">
      <PageHeader title={t("tutor.createTest")} subtitle={`${ws.displayName} · a revision plan is generated from the topics you tick`} />
      <form action={createAssessmentAction} className="space-y-5">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("nav.students")} className="sm:col-span-2">
              <select name="studentId" className="input" defaultValue={student}>
                {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
              </select>
            </Field>
            <Field label={t("common.name")} className="sm:col-span-2"><input name="name" className="input" required placeholder="e.g. Algebra Unit Test" /></Field>
            <Field label={t("common.date")}><input name="date" type="date" className="input" defaultValue={addDaysKey(todayKey(), 14)} required /></Field>
            <Field label="Subject">
              <select name="subjectId" className="input">
                <option value="">—</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label={t("common.priority")}>
              <select name="priority" className="input" defaultValue="normal">
                {["low", "normal", "high"].map((p) => <option key={p} value={p}>{t(`common.${p}`)}</option>)}
              </select>
            </Field>
            <Field label={t("common.notes")} className="sm:col-span-2"><textarea name="notes" className="input min-h-20" placeholder="Format, calculator rules, what the teacher said…" /></Field>
          </div>
        </Card>
        <Card title="Topics on the test">
          <div className="grid gap-1 sm:grid-cols-2 max-h-96 overflow-y-auto">
            {ws.allTopics.filter((tp) => tp.inScope).map((tp) => (
              <label key={tp.id} className="flex items-center gap-2 text-sm py-0.5">
                <input type="checkbox" name="topicId" value={tp.id} className="size-4" />
                <span className="text-xs text-mute w-9">{tp.code}</span>
                {tp.name}
              </label>
            ))}
          </div>
        </Card>
        <button className="btn-primary" type="submit">{t("tutor.createTest")}</button>
      </form>
    </div>
  );
}
