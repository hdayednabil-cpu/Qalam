import { getDb } from "@/db";
import { getViewer } from "@/lib/auth";
import { getWorkspace } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { SessionRow } from "@/components/items";
export const dynamic = "force-dynamic";
export default async function Page() {
  const v = await getViewer("student");
  const ws = await getWorkspace(getDb(), v.user, v.studentId!);
  const past = ws.sessions.filter((s) => s.status === "completed" && s.sharedSummary);
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title={t("nav.sessions")} />
      <Card title={t("tutor.upcoming")}>{ws.upcoming.length ? <div className="divide-y divide-line/70">{ws.upcoming.slice(0, 6).map((s) => <SessionRow key={s.id} s={s} showStudents={false} compact />)}</div> : <EmptyState>{t("empty.noSessions")}</EmptyState>}</Card>
      <Card title="What we covered">{past.length ? <div className="divide-y divide-line/70">{past.map((s) => <SessionRow key={s.id} s={s} showStudents={false} />)}</div> : <EmptyState>{t("empty.noSessions")}</EmptyState>}</Card>
    </div>
  );
}
