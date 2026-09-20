import { getDb } from "@/db";
import { getViewer } from "@/lib/auth";
import { getWorkspace } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { HomeworkRow } from "@/components/items";

export const dynamic = "force-dynamic";

export default async function StudentHomeworkList() {
  const v = await getViewer("student");
  const ws = await getWorkspace(getDb(), v.user, v.studentId!);
  const open = ws.homework.filter((h) => ["assigned", "in_progress", "corrections_requested", "overdue"].includes(h.effectiveStatus)).sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  const waiting = ws.homework.filter((h) => h.effectiveStatus === "submitted" || h.effectiveStatus === "resubmitted");
  const done = ws.homework.filter((h) => h.effectiveStatus === "completed" || h.effectiveStatus === "reviewed");
  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader title={t("nav.homework")} subtitle={`${open.length} to do · ${waiting.length} waiting for review · ${done.length} done`} />
      <Card title="To do">{open.length ? <div className="divide-y divide-line/70">{open.map((h) => <HomeworkRow key={h.id} h={h} href={`/student/homework/${h.id}`} />)}</div> : <EmptyState>{t("student.noHomework")}</EmptyState>}</Card>
      {waiting.length > 0 && <Card title="Waiting for review"><div className="divide-y divide-line/70">{waiting.map((h) => <HomeworkRow key={h.id} h={h} href={`/student/homework/${h.id}`} />)}</div></Card>}
      {done.length > 0 && <Card title="Done"><div className="divide-y divide-line/70">{done.map((h) => <HomeworkRow key={h.id} h={h} href={`/student/homework/${h.id}`} />)}</div></Card>}
    </div>
  );
}
