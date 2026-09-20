import { t } from "@/lib/i18n";
import { formatMonthYear, todayKey } from "@/lib/dates";
import { Card, EmptyState, PageHeader, Stat } from "@/components/ui";
import { currentChild } from "../child";
import { ChildSwitcher } from "../child-switcher";
export const dynamic = "force-dynamic";
export default async function Page() {
  const { kids, child, ws } = await currentChild();
  return (
    <div className="max-w-3xl space-y-5">
      <ChildSwitcher kids={kids} currentId={child.id} back="/parent/reports" />
      <PageHeader title={t("parent.reportArea")} subtitle="Published reports will appear here. Until then, this month's live figures:" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={formatMonthYear(todayKey())} value={ws.stats.sessionsThisMonth} hint="sessions completed" />
        <Stat label={t("parent.homework")} value={ws.stats.homeworkCompletion !== null ? `${ws.stats.homeworkCompletion}%` : "—"} hint="completion" />
        <Stat label={t("tutor.coverage")} value={`${Math.round(ws.enrolments.reduce((a, e) => a + e.coverage.percent, 0) / Math.max(1, ws.enrolments.length))}%`} hint="across subjects" />
        <Stat label="Attendance" value={ws.stats.attendance !== null ? `${ws.stats.attendance}%` : "—"} />
      </div>
      <Card><EmptyState>{t("parent.noReports")}</EmptyState></Card>
    </div>
  );
}
