import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import * as sch from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getHomeworkDetail } from "@/lib/queries";
import { signedFileUrl } from "@/lib/files";
import { t, masteryLabel, visibilityLabel } from "@/lib/i18n";
import { formatDateTime, formatDayShort } from "@/lib/dates";
import { Badge, Card, EmptyState, Field, PageHeader, StatusBadge, MasteryDot } from "@/components/ui";
import { reviewAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function HomeworkReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("tutor");
  const detail = await getHomeworkDetail(getDb(), user, id);
  if (!detail) notFound();
  const { homework: h, view, ws, feedback } = detail;
  const latest = h.submissions[0];
  const reviewable = latest && latest.outcome === "pending";
  const linkedTopics = ws.allTopics.filter((tp) => view.topics.some((x) => x.id === tp.id));
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<Link href={`/tutor/students/${h.studentId}`} className="hover:underline">{ws.displayName} · {ws.student.gradeYear}</Link>}
        title={h.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={view.effectiveStatus} />
            <span>{h.type} · {t("common.due")} {formatDateTime(h.dueAt)}</span>
            {h.score && <Badge tone="success">{h.score}</Badge>}
          </span>
        }
      />
      {h.instructions && <p className="text-sm text-ink-800 max-w-2xl">{h.instructions}</p>}
      {linkedTopics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {linkedTopics.map((tp) => (
            <span key={tp.id} className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs"><MasteryDot level={tp.mastery} /> {tp.name}</span>
          ))}
        </div>
      )}

      {!latest ? (
        <EmptyState>{t("empty.noSubmission")}</EmptyState>
      ) : (
        <form action={reviewAction} className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <input type="hidden" name="homeworkId" value={h.id} />
          <input type="hidden" name="submissionId" value={latest.id} />
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-mute">
              <span className="font-medium text-ink-900">Submission v{latest.version}</span>
              <span>· {formatDateTime(latest.submittedAt)}</span>
              <StatusBadge status={latest.outcome} />
              {h.submissions.length > 1 && <span>· {h.submissions.length} versions</span>}
            </div>
            {latest.comment && <blockquote className="rounded-xl bg-saffron-100 px-4 py-2 text-sm">“{latest.comment}” — {ws.displayName}</blockquote>}
            {latest.pages.map((p, i) => {
              const url = signedFileUrl(p.fileId);
              const pageFeedback = feedback.filter((f) => f.submissionPageId === p.id);
              return (
                <Card key={p.id} padded={false} className="overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 text-xs text-mute">
                    <span>Page {i + 1} of {latest.pages.length}</span>
                    <a href={url} target="_blank" rel="noreferrer" className="hover:underline">{t("common.open")} ↗</a>
                  </div>
                  {p.file.mimeType === "application/pdf" ? (
                    <iframe src={url} className="w-full h-[70vh] bg-white" title={`Page ${i + 1}`} />
                  ) : (
                    <a href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Page ${i + 1}`} className="zoomable w-full bg-white" />
                    </a>
                  )}
                  <div className="p-3 space-y-2">
                    {pageFeedback.map((f) => (
                      <p key={f.id} className="rounded-lg bg-ink-50 px-3 py-1.5 text-sm">{f.body}</p>
                    ))}
                    {reviewable && (
                      <>
                        <input type="hidden" name="pageId" value={p.id} />
                        <input name={`page:${p.id}`} className="input" placeholder={t("tutor.perPageComment")} />
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="space-y-4 lg:sticky lg:top-4 self-start">
            {reviewable ? (
              <Card title={t("tutor.review")}>
                <div className="space-y-3">
                  <Field label={t("tutor.overallFeedback")}><textarea name="feedback" className="input min-h-28" placeholder="What was good, what to fix, what to do next." /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t("common.score")} hint="free-form"><input name="score" className="input" placeholder="8/10, B, ✓" /></Field>
                    <Field label={t("common.visibility")}>
                      <select name="visibility" className="input" defaultValue="student">
                        {sch.VISIBILITY.filter((v) => v !== "private").map((v) => <option key={v} value={v}>{visibilityLabel(v)}</option>)}
                      </select>
                    </Field>
                  </div>
                  {linkedTopics.length > 0 && (
                    <div>
                      <div className="label mb-1.5">{t("tutor.linkMastery")}</div>
                      <div className="space-y-1.5">
                        {linkedTopics.map((tp) => (
                          <div key={tp.id} className="flex items-center gap-2 text-sm">
                            <input type="hidden" name="topicId" value={tp.id} />
                            <span className="flex-1 truncate">{tp.name}</span>
                            <select name={`mastery:${tp.id}`} className="input py-1 text-xs w-36" defaultValue="">
                              <option value="">keep {tp.mastery ? masteryLabel(tp.mastery) : "—"}</option>
                              {sch.MASTERY.map((l) => <option key={l} value={l}>{masteryLabel(l)}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid gap-2 pt-2">
                    <button className="btn-primary" name="action" value="approve" type="submit">{t("tutor.approve")}</button>
                    <button className="btn-danger" name="action" value="corrections" type="submit">{t("tutor.requestCorrections")}</button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card title={t("nav.feedback")}>
                {feedback.filter((f) => !f.submissionPageId).length ? (
                  <ul className="space-y-2">
                    {feedback.filter((f) => !f.submissionPageId).map((f) => (
                      <li key={f.id} className="text-sm">
                        <div className="text-xs text-mute mb-0.5">{formatDayShort(f.createdAt)} · {visibilityLabel(f.visibility)}</div>
                        {f.body}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState>{t("empty.noFeedback")}</EmptyState>
                )}
              </Card>
            )}
            {h.submissions.length > 1 && (
              <Card title="Earlier versions">
                <ul className="text-sm space-y-1">
                  {h.submissions.slice(1).map((sub) => (
                    <li key={sub.id} className="flex justify-between"><span>v{sub.version} · {formatDayShort(sub.submittedAt)}</span><StatusBadge status={sub.outcome} /></li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
