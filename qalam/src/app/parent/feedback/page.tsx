import { canSee } from "@/lib/access";
import { t } from "@/lib/i18n";
import { formatDayShort } from "@/lib/dates";
import { Card, EmptyState, PageHeader, cx } from "@/components/ui";
import { currentChild } from "../child";
import { ChildSwitcher } from "../child-switcher";
export const dynamic = "force-dynamic";
export default async function Page() {
  const { kids, child, ws } = await currentChild();
  const items = ws.feedback.filter((f) => canSee("guardian", f.visibility));
  return (
    <div className="max-w-3xl">
      <ChildSwitcher kids={kids} currentId={child.id} back="/parent/feedback" />
      <PageHeader title={t("nav.feedback")} subtitle={`Notes from the tutor about ${ws.displayName}`} />
      <Card padded={false}>
        {items.length ? <ul className="divide-y divide-line/70">{items.map((f) => <li key={f.id} className={cx("px-5 py-3", f.important && "bg-saffron-100/50")}><div className="text-xs text-mute mb-1">{formatDayShort(f.createdAt)} · {f.authorName}{f.important ? " · important" : ""}</div><p className="text-sm">{f.body}</p></li>)}</ul> : <div className="p-5"><EmptyState>{t("parent.noFeedback")}</EmptyState></div>}
      </Card>
    </div>
  );
}
