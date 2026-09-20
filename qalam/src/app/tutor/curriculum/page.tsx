import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as sch from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { Badge, Card, Field, PageHeader } from "@/components/ui";
import { importCurriculumAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function CurriculumPage() {
  const user = await requireUser("tutor");
  const db = getDb();
  const templates = await db.query.curriculumTemplates.findMany({ where: eq(sch.curriculumTemplates.tutorId, user.tutorId), with: { subject: true, sections: { with: { topics: true }, orderBy: (s, { asc }) => [asc(s.sortOrder)] } } });
  const subjects = await db.query.subjects.findMany({ where: eq(sch.subjects.tutorId, user.tutorId) });
  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.curriculum")} subtitle="Templates are reusable across students. Enrolling copies the topics so each student's scope can be tailored." />
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((tp) => (
          <Card key={tp.id} title={tp.name} subtitle={<span>{tp.subject.name} · {tp.board} · {tp.level} {tp.isDraft && <Badge tone="warn">draft — verify against the official specification</Badge>}</span>}>
            <div className="space-y-2">
              {tp.sections.map((sec) => (
                <details key={sec.id}>
                  <summary className="cursor-pointer text-sm font-medium">{sec.code ? `${sec.code} ` : ""}{sec.name} <span className="text-xs text-mute font-normal">({sec.topics.length})</span></summary>
                  <ul className="mt-1 ml-4 text-sm text-ink-800 space-y-0.5">{[...sec.topics].sort((a, b) => a.sortOrder - b.sortOrder).map((x) => <li key={x.id}><span className="text-xs text-mute w-10 inline-block">{x.code}</span>{x.name}</li>)}</ul>
                </details>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <Card title="Add a curriculum by pasting" subtitle="One topic per line. Start a section with “## Section name”. Optional code: “2.3 | Changing the subject”.">
        <form action={importCurriculumAction} className="grid gap-3 sm:grid-cols-2">
          <Field label={t("common.name")}><input name="name" className="input" required placeholder="Grade 9 Term 2 scheme" /></Field>
          <Field label="Subject">
            <select name="subjectId" className="input">{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </Field>
          <Field label="Board"><input name="board" className="input" placeholder="School / Edexcel / IB" /></Field>
          <Field label="Level"><input name="level" className="input" placeholder="Grade 9" /></Field>
          <Field label="Topics" className="sm:col-span-2"><textarea name="text" className="input min-h-48 font-mono text-sm" required placeholder={"## Number\n1.1 | Place value\n1.2 | Rounding\n## Algebra\nExpanding brackets"} /></Field>
          <button className="btn-primary" type="submit">Import</button>
        </form>
      </Card>
    </div>
  );
}
