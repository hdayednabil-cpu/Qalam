import { t } from "@/lib/i18n";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { HomeworkRow } from "@/components/items";
import { currentChild } from "../child";
import { ChildSwitcher } from "../child-switcher";
export const dynamic = "force-dynamic";
export default async function Page() {
  const { kids, child, ws } = await currentChild();
  const open = ws.homework.filter((h) => ["assigned", "in_progress", "corrections_requested", "overdue", "submitted", "resubmitted"].includes(h.effectiveStatus));
  const done = ws.homework.filter((h) => h.effectiveStatus === "completed");
  return (
    <div className="max-w-3xl space-y-5">
      <ChildSwitcher kids={kids} currentId={child.id} back="/parent/homework" />
      <PageHeader title={t("nav.homework")} subtitle={`${ws.displayName} · completion ${ws.stats.homeworkCompletion ?? "—"}% of homework that was due`} />
      <Card title="Current">{open.length ? <div className="divide-y divide-line/70">{open.map((h) => <HomeworkRow key={h.id} h={h} href="/parent/homework" />)}</div> : <EmptyState>{t("empty.noHomework")}</EmptyState>}</Card>
      <Card title="Completed">{done.length ? <div className="divide-y divide-line/70">{done.map((h) => <HomeworkRow key={h.id} h={h} href="/parent/homework" />)}</div> : <EmptyState>{t("common.nothingHere")}</EmptyState>}</Card>
    </div>
  );
}
