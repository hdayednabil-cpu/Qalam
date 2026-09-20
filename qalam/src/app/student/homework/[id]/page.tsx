import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { getViewer } from "@/lib/auth";
import { canSee } from "@/lib/access";
import { getHomeworkDetail } from "@/lib/queries";
import { signedFileUrl } from "@/lib/files";
import { t } from "@/lib/i18n";
import { formatDateTime, formatDayShort } from "@/lib/dates";
import { Badge, Card, PageHeader, StatusBadge } from "@/components/ui";
import { TopicChips } from "@/components/items";
import { SubmitWork } from "./submit-work";
import { startHomeworkAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function StudentHomeworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = await getViewer("student");
  const detail = await getHomeworkDetail(getDb(), v.user, id);
  if (!detail || detail.homework.studentId !== v.studentId) notFound();
  const { homework: h, view, ws, feedback } = detail;
  const visible = feedback.filter((f) => canSee("student", f.visibility));
  const latest = h.submissions[0];
  const canSubmit = ["assigned", "in_progress", "corrections_requested", "overdue"].includes(view.effectiveStatus) && view.submissionRequirement !== "none" && !v.viewingAs;
  const labels = Object.fromEntries(["uploadPages", "takePhoto", "addPage", "replace", "remove", "moveUp", "moveDown", "submitWork", "resubmit", "commentPlaceholder", "pagesHint", "converting", "uploading", "processingFailed"].map((k) => [k, t(`student.${k}`)]));
  labels.tooLarge = t("student.tooLarge", { mb: 15 });
  labels.maxPages = t("student.maxPages", { n: 20 });
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader eyebrow={<Link href="/student/homework" className="hover:underline">← {t("nav.homework")}</Link>} title={h.title} subtitle={<span className="flex flex-wrap items-center gap-2"><StatusBadge status={view.effectiveStatus} /><span>{t("common.due")} {formatDateTime(h.dueAt)}</span>{h.estimatedMinutes && <span>· ~{h.estimatedMinutes} {t("common.minutes")}</span>}{h.score && <Badge tone="success">{h.score}</Badge>}</span>} />
      {h.instructions && <Card title="Instructions"><p className="whitespace-pre-line">{h.instructions}</p></Card>}
      <TopicChips topics={ws.allTopics.filter((tp) => view.topics.some((x) => x.id === tp.id))} empty="" />

      {visible.length > 0 && (
        <Card title={t("nav.feedback")}>
          <ul className="space-y-2">{visible.map((f) => <li key={f.id} className="rounded-xl bg-ink-50 px-3 py-2 text-sm"><span className="text-xs text-mute">{formatDayShort(f.createdAt)}{f.submissionPageId ? " · on a page" : ""} · </span>{f.body}</li>)}</ul>
        </Card>
      )}

      {view.effectiveStatus === "submitted" || view.effectiveStatus === "resubmitted" ? (
        <div className="rounded-2xl bg-moss-100 px-5 py-4 text-moss-700 font-medium">{t("student.submitted")} Your tutor will review it soon.</div>
      ) : null}

      {canSubmit && (
        <Card title={view.effectiveStatus === "corrections_requested" ? t("student.resubmit") : t("student.uploadPages")}>
          {h.status === "assigned" && (
            <form action={startHomeworkAction} className="mb-3"><input type="hidden" name="homeworkId" value={h.id} /><button className="btn-ghost btn-sm" type="submit">I've started this</button></form>
          )}
          <SubmitWork homeworkId={h.id} resubmit={view.effectiveStatus === "corrections_requested"} labels={labels} />
        </Card>
      )}

      {latest && (
        <Card title={`Your submission (v${latest.version})`} subtitle={formatDateTime(latest.submittedAt)}>
          {latest.comment && <p className="text-sm mb-3 text-mute">“{latest.comment}”</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {latest.pages.map((p, i) => (
              <a key={p.id} href={signedFileUrl(p.fileId)} target="_blank" rel="noreferrer" className="card overflow-hidden">
                {p.file.mimeType === "application/pdf" ? <div className="aspect-[3/4] grid place-items-center text-sm text-mute">PDF · page {i + 1}</div> : <img src={signedFileUrl(p.fileId)} alt={`Page ${i + 1}`} className="aspect-[3/4] w-full object-cover" />}
                {visible.some((f) => f.submissionPageId === p.id) && <div className="px-2 py-1 text-xs text-ink-700">{visible.filter((f) => f.submissionPageId === p.id).map((f) => f.body).join(" · ")}</div>}
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
