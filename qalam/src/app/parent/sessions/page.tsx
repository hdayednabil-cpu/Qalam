import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/dates";
import { Card, EmptyState, PageHeader, Progress } from "@/components/ui";
import { SessionRow } from "@/components/items";
import { currentChild } from "../child";
import { ChildSwitcher } from "../child-switcher";
export const dynamic = "force-dynamic";
export default async function Page() {
  const { kids, child, ws } = await currentChild();
  const history = ws.sessions.filter((s) => s.status !== "scheduled" || s.needsLog);
  return (
    <div className="max-w-3xl space-y-5">
      <ChildSwitcher kids={kids} currentId={child.id} back="/parent/sessions" />
      <PageHeader title={t("nav.sessions")} subtitle={`${ws.displayName} · attendance ${ws.stats.attendance ?? "—"}%`} />
      {ws.pkg && (
        <Card title={t("parent.package")}>
          <div className="flex items-baseline justify-between"><span className="text-3xl font-semibold display">{ws.pkg.remaining}</span><span className="text-sm text-mute">{t("common.of")} {ws.pkg.total} {t("common.remaining")}{ws.pkg.shared ? " · shared by the family" : ""}</span></div>
          <Progress value={Math.round((ws.pkg.used / ws.pkg.total) * 100)} tone={ws.pkg.low ? "danger" : "brand"} className="mt-2" />
          <p className="mt-2 text-xs text-mute">Completed and no-show sessions count. Cancellations with less than 24 hours' notice count. Tutor cancellations never count.</p>
        </Card>
      )}
      <Card title={t("tutor.upcoming")}>{ws.upcoming.length ? <div className="divide-y divide-line/70">{ws.upcoming.slice(0, 8).map((s) => <SessionRow key={s.id} s={s} showStudents={false} compact />)}</div> : <EmptyState>{t("empty.noSessions")}</EmptyState>}</Card>
      <Card title={t("tutor.sessionHistory")} subtitle={ws.student.startDate ? `since ${formatDate(ws.student.startDate)}` : undefined}>{history.length ? <div className="divide-y divide-line/70">{history.map((s) => <SessionRow key={s.id} s={{ ...s, privateNotes: null }} showStudents={false} />)}</div> : <EmptyState>{t("empty.noSessions")}</EmptyState>}</Card>
    </div>
  );
}
