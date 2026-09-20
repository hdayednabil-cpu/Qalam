import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { requireUser } from "@/lib/auth";
import { getWorkspace, listStudents } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { addDaysKey, todayKey } from "@/lib/dates";
import { Card, Field, PageHeader } from "@/components/ui";
import { assignHomeworkAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NewHomeworkPage({ searchParams }: { searchParams: Promise<{ student?: string; session?: string }> }) {
  const { student, session } = await searchParams;
  const user = await requireUser("tutor");
  const db = getDb();
  if (!student) {
    const students = await listStudents(db, user);
    redirect(students[0] ? `/tutor/homework/new?student=${students[0].id}` : "/tutor/students");
  }
  const ws = await getWorkspace(db, user, student);
  const students = await listStudents(db, user);
  return (
    <div className="max-w-2xl">
      <PageHeader title={t("tutor.assignHomework")} subtitle={`${ws.displayName} · ${ws.student.gradeYear}`} />
      <form action={assignHomeworkAction} className="space-y-5">
        <input type="hidden" name="sessionId" value={session ?? ""} />
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("nav.students")} className="sm:col-span-2">
              <select name="studentId" className="input" defaultValue={student}>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            </Field>
            <Field label={t("common.title")} className="sm:col-span-2"><input name="title" className="input" required placeholder="e.g. Factorising worksheet Q1–12" /></Field>
            <Field label={t("common.type")} hint="Free text — worksheet, past paper, corrections, reading…"><input name="type" className="input" defaultValue="worksheet" list="hw-types" /><datalist id="hw-types">{["worksheet", "past paper", "corrections", "textbook questions", "revision", "reading", "challenge"].map((x) => <option key={x} value={x} />)}</datalist></Field>
            <Field label={t("common.priority")}>
              <select name="priority" className="input" defaultValue="normal">
                {["low", "normal", "high"].map((p) => <option key={p} value={p}>{t(`common.${p}`)}</option>)}
              </select>
            </Field>
            <Field label={t("common.dueDate")}><input name="dueDate" type="date" className="input" defaultValue={addDaysKey(todayKey(), 3)} required /></Field>
            <Field label={t("common.time")}><input name="dueTime" type="time" className="input" defaultValue="20:00" /></Field>
            <Field label="Estimated minutes"><input name="estimatedMinutes" type="number" className="input" min={5} step={5} placeholder="30" /></Field>
            <Field label="Submission">
              <select name="submissionRequirement" className="input" defaultValue="photos">
                <option value="photos">Photos of work</option>
                <option value="typed">Typed answer</option>
                <option value="none">Nothing to submit</option>
              </select>
            </Field>
            <Field label="Instructions" className="sm:col-span-2"><textarea name="instructions" className="input min-h-24" placeholder="What exactly to do, and how to show working." /></Field>
            <Field label="Link (optional)"><input name="linkUrl" type="url" className="input" placeholder="https://" /></Field>
            <Field label="Link label"><input name="linkLabel" className="input" placeholder="Worksheet PDF" /></Field>
          </div>
        </Card>
        <Card title={t("common.topics")} subtitle="Linked topics let a review update mastery in one click.">
          <div className="grid gap-1 sm:grid-cols-2 max-h-80 overflow-y-auto">
            {ws.allTopics.filter((tp) => tp.inScope).map((tp) => (
              <label key={tp.id} className="flex items-center gap-2 text-sm py-0.5">
                <input type="checkbox" name="topicId" value={tp.id} defaultChecked={tp.isCurrent} className="size-4" />
                <span className="text-xs text-mute w-9">{tp.code}</span>
                {tp.name}
              </label>
            ))}
          </div>
        </Card>
        <button className="btn-primary" type="submit">{t("tutor.assignHomework")}</button>
      </form>
    </div>
  );
}
