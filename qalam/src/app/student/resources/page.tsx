import { getDb } from "@/db";
import { getViewer } from "@/lib/auth";
import { getWorkspace } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
export const dynamic = "force-dynamic";
export default async function Page() {
  const v = await getViewer("student");
  const ws = await getWorkspace(getDb(), v.user, v.studentId!);
  return (
    <div className="max-w-3xl">
      <PageHeader title={t("nav.resources")} />
      <Card padded={false}>
        {ws.resources.length ? (
          <ul className="divide-y divide-line/70">{ws.resources.map((r) => <li key={r.id} className="px-5 py-3 flex flex-wrap items-center gap-2 text-sm"><a href={r.url ?? "#"} target="_blank" rel="noreferrer" className="font-medium hover:underline">{r.title}</a><Badge tone="brand">{r.type}</Badge>{r.tags.map((tg) => <Badge key={tg}>{tg}</Badge>)}{!r.studentId && <span className="text-xs text-mute ml-auto">shared library</span>}</li>)}</ul>
        ) : (
          <div className="p-5"><EmptyState>{t("empty.noResources")}</EmptyState></div>
        )}
      </Card>
    </div>
  );
}
