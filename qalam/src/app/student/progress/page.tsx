import { getDb } from "@/db";
import { getViewer } from "@/lib/auth";
import { getWorkspace } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { PageHeader } from "@/components/ui";
import { ProgressView } from "@/components/progress-view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const v = await getViewer("student");
  const ws = await getWorkspace(getDb(), v.user, v.studentId!);
  return (
    <div className="max-w-3xl">
      <PageHeader title={t("nav.progress")} subtitle="Every topic on your curriculum and where you are with it." />
      <ProgressView ws={ws} />
    </div>
  );
}
