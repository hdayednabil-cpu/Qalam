import { t } from "@/lib/i18n";
import { PageHeader } from "@/components/ui";
import { ProgressView } from "@/components/progress-view";
import { currentChild } from "../child";
import { ChildSwitcher } from "../child-switcher";
export const dynamic = "force-dynamic";
export default async function Page() {
  const { kids, child, ws } = await currentChild();
  return (
    <div className="max-w-3xl">
      <ChildSwitcher kids={kids} currentId={child.id} back="/parent/progress" />
      <PageHeader title={t("nav.progress")} subtitle={`${ws.displayName} · curriculum coverage and mastery per topic`} />
      <ProgressView ws={ws} />
    </div>
  );
}
