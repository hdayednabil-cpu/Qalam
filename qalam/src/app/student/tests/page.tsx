import { getDb } from "@/db";
import { getViewer } from "@/lib/auth";
import { getWorkspace } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { formatDate, relativeDays } from "@/lib/dates";
import { Card, EmptyState, PageHeader, Progress } from "@/components/ui";
import { RevisionRow } from "@/components/items";
export const dynamic = "force-dynamic";
export default async function Page() {
  const v = await getViewer("student");
  const ws = await getWorkspace(getDb(), v.user, v.studentId!);
  const upcoming = ws.assessments.filter((a) => a.daysUntil >= 0 && !a.result);
  const past = ws.assessments.filter((a) => a.result || a.daysUntil < 0);
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title={t("nav.revision")} />
      {upcoming.length ? upcoming.map((a) => (
        <Card key={a.id} title={a.name} subtitle={`${formatDate(a.date)} · ${relativeDays(a.daysUntil)}${a.subject ? ` · ${a.subject}` : ""}`}>
          <Progress value={a.revision.percent} tone={a.revision.percent >= 70 ? "success" : "warn"} label={t("student.revisionProgress")} className="mb-3" />
          <div className="divide-y divide-line/60">{a.topics.map((tp) => <RevisionRow key={tp.enrolmentTopicId} tp={tp} />)}</div>
          {ws.resources.filter((r) => r.assessmentId === a.id).length > 0 && (
            <ul className="mt-3 text-sm space-y-1">{ws.resources.filter((r) => r.assessmentId === a.id).map((r) => <li key={r.id}>📎 <a href={r.url ?? "#"} className="hover:underline" target="_blank" rel="noreferrer">{r.title}</a></li>)}</ul>
          )}
        </Card>
      )) : <EmptyState>{t("empty.noTests")}</EmptyState>}
      {past.length > 0 && (
        <Card title={t("parent.results")}>
          <ul className="divide-y divide-line/70">{past.map((a) => <li key={a.id} className="py-2 flex flex-wrap items-center gap-2 text-sm"><span className="font-medium">{a.name}</span><span className="text-mute">{formatDate(a.date)}</span><span className="ml-auto font-semibold">{a.result?.result ?? "—"}</span>{a.result?.sharedComment && <p className="w-full text-mute">{a.result.sharedComment}</p>}</li>)}</ul>
        </Card>
      )}
    </div>
  );
}
