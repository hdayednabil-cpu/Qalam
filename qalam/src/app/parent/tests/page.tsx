import { t } from "@/lib/i18n";
import { formatDate, relativeDays } from "@/lib/dates";
import { Card, EmptyState, PageHeader, Progress } from "@/components/ui";
import { RevisionRow } from "@/components/items";
import { currentChild } from "../child";
import { ChildSwitcher } from "../child-switcher";
export const dynamic = "force-dynamic";
export default async function Page() {
  const { kids, child, ws } = await currentChild();
  const upcoming = ws.assessments.filter((a) => a.daysUntil >= 0 && !a.result);
  const past = ws.assessments.filter((a) => a.result || a.daysUntil < 0);
  return (
    <div className="max-w-3xl space-y-5">
      <ChildSwitcher kids={kids} currentId={child.id} back="/parent/tests" />
      <PageHeader title={t("nav.revision")} subtitle={t("parent.readinessNote")} />
      {upcoming.length ? upcoming.map((a) => (
        <Card key={a.id} title={a.name} subtitle={`${formatDate(a.date)} · ${relativeDays(a.daysUntil)}${a.subject ? ` · ${a.subject}` : ""}`}>
          <Progress value={a.revision.percent} tone={a.revision.percent >= 70 ? "success" : "warn"} label={t("parent.readiness")} className="mb-3" />
          <div className="divide-y divide-line/60">{a.topics.map((tp) => <RevisionRow key={tp.enrolmentTopicId} tp={tp} />)}</div>
        </Card>
      )) : <EmptyState>{t("empty.noTests")}</EmptyState>}
      <Card title={t("parent.results")}>
        {past.length ? <ul className="divide-y divide-line/70">{past.map((a) => <li key={a.id} className="py-2 flex flex-wrap items-center gap-2 text-sm"><span className="font-medium">{a.name}</span><span className="text-mute">{formatDate(a.date)}</span><span className="ml-auto font-semibold">{a.result?.result ?? "awaiting result"}</span>{a.result?.sharedComment && <p className="w-full text-mute">{a.result.sharedComment}</p>}</li>)}</ul> : <EmptyState>{t("empty.noResults")}</EmptyState>}
      </Card>
    </div>
  );
}
