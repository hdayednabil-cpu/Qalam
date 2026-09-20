import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as sch from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getWorkspace } from "@/lib/queries";
import { REVISION_GLYPH } from "@/lib/domain";
import { t, revisionLabel } from "@/lib/i18n";
import { formatDate, relativeDays } from "@/lib/dates";
import { Badge, Card, Field, PageHeader, Progress, MasteryDot, cx } from "@/components/ui";
import { ShareActions } from "@/components/share-actions";
import { recordResultAction, revisionStatusAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("tutor");
  const db = getDb();
  const row = await db.query.assessments.findFirst({ where: eq(sch.assessments.id, id) });
  if (!row || row.tutorId !== user.tutorId) notFound();
  const ws = await getWorkspace(db, user, row.studentId);
  const a = ws.assessments.find((x) => x.id === id)!;
  const past = a.daysUntil < 0;
  const resources = ws.resources.filter((r) => r.assessmentId === id);
  const phone = ws.guardians.find((g) => g.phone)?.phone ?? null;
  const summary = `${ws.displayName} — ${a.name} (${formatDate(a.date)}): ${a.revision.revised}/${a.revision.total} topics revised. ${a.topics.filter((x) => x.status !== "revised").map((x) => x.name).join(", ") || "All topics revised."}`;
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        eyebrow={<Link href={`/tutor/students/${row.studentId}#tests`} className="hover:underline">{ws.displayName} · {a.subject ?? ""}</Link>}
        title={a.name}
        subtitle={<span>{formatDate(a.date)} · {relativeDays(a.daysUntil)}{a.priority === "high" && <Badge tone="danger" className="ml-2">{t("common.high")}</Badge>}</span>}
      />
      {a.notes && <p className="text-sm text-ink-800">{a.notes}</p>}

      <Card title="Revision plan" subtitle="Status is derived from mastery unless you set it. ✓ revised · ◐ in progress · ! needs work · ○ not started">
        <Progress value={a.revision.percent} tone={a.revision.percent >= 70 ? "success" : a.revision.percent >= 40 ? "warn" : "danger"} label={t("parent.readiness")} className="mb-4" />
        <div className="divide-y divide-line/60">
          {a.topics.map((tp) => {
            const tone = tp.status === "revised" ? "text-moss-600" : tp.status === "needs_work" ? "text-coral-600" : tp.status === "in_progress" ? "text-saffron-600" : "text-stone-400";
            return (
              <div key={tp.enrolmentTopicId} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <span className={cx("w-5 text-center font-bold", tone)}>{REVISION_GLYPH[tp.status]}</span>
                <span className="flex-1 min-w-40">{tp.name}{tp.wentWrong && <Badge tone="danger" className="ml-2">went wrong</Badge>}</span>
                <span className="inline-flex items-center gap-1 text-xs text-mute"><MasteryDot level={tp.mastery} /> mastery</span>
                <form action={revisionStatusAction} className="flex items-center gap-1">
                  <input type="hidden" name="assessmentId" value={id} />
                  <input type="hidden" name="topicId" value={tp.enrolmentTopicId} />
                  <select name="status" className="input py-1 text-xs w-36" defaultValue={tp.explicit ?? "auto"}>
                    <option value="auto">auto ({revisionLabel(tp.status)})</option>
                    {sch.REVISION_STATUS.map((r) => <option key={r} value={r}>{revisionLabel(r)}</option>)}
                  </select>
                  <button className="btn-secondary btn-sm" type="submit">{t("common.save")}</button>
                </form>
              </div>
            );
          })}
        </div>
        <div className="mt-4"><ShareActions text={summary} phone={phone} labels={{ copy: t("common.copy"), copied: t("common.copied"), whatsapp: t("common.whatsapp") }} /></div>
      </Card>

      {resources.length > 0 && (
        <Card title={t("nav.resources")}>
          <ul className="space-y-1 text-sm">{resources.map((r) => <li key={r.id}><a className="hover:underline" href={r.url ?? "#"} target="_blank" rel="noreferrer">{r.title}</a> <span className="text-xs text-mute">· {r.type}</span></li>)}</ul>
        </Card>
      )}

      <Card title={a.result ? "Result" : t("tutor.recordResult")} subtitle={past ? undefined : "Available after the test date — you can still record early."}>
        {a.result && (
          <div className="mb-4 rounded-xl bg-moss-100 px-4 py-3">
            <div className="text-2xl font-semibold display">{a.result.result}</div>
            {a.result.sharedComment && <p className="text-sm mt-1">{a.result.sharedComment}</p>}
            {a.result.reflection && <p className="text-sm mt-1 text-mute">Private: {a.result.reflection}</p>}
          </div>
        )}
        <form action={recordResultAction} className="space-y-3">
          <input type="hidden" name="assessmentId" value={id} />
          <Field label="Result (free-form)"><input name="result" className="input" defaultValue={a.result?.result ?? ""} placeholder="68%, Level 6, B+" required /></Field>
          <Field label="What went wrong — ticked topics are marked Needs work and a next step is created">
            <div className="grid gap-1 sm:grid-cols-2">
              {a.topics.map((tp) => (
                <label key={tp.enrolmentTopicId} className="flex items-center gap-2 text-sm"><input type="checkbox" name="wentWrong" value={tp.enrolmentTopicId} defaultChecked={tp.wentWrong} className="size-4" />{tp.name}</label>
              ))}
            </div>
          </Field>
          <Field label="Shared comment (family)"><input name="sharedComment" className="input" defaultValue={a.result?.sharedComment ?? ""} /></Field>
          <Field label="Reflection (private)"><textarea name="reflection" className="input min-h-20" defaultValue={a.result?.reflection ?? ""} /></Field>
          <button className="btn-primary" type="submit">{t("tutor.recordResult")}</button>
        </form>
      </Card>
    </div>
  );
}
