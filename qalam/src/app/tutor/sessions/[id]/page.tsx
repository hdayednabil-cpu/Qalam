import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { requireUser } from "@/lib/auth";
import { getSession, getWorkspace } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { formatDayLong, formatTime, formatTime24, minutesLabel, toDateKey } from "@/lib/dates";
import { Badge, Card, Field, PageHeader, StatusBadge } from "@/components/ui";
import { SessionLogForm } from "./session-log-form";
import { logSessionAction, rescheduleAction, sessionStatusAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("tutor");
  const db = getDb();
  const sess = await getSession(db, user, id);
  if (!sess) notFound();
  const blocks = await Promise.all(
    sess.students.map(async (st) => {
      const ws = await getWorkspace(db, user, st.id);
      const existing: Record<string, typeof sess.topics[number]["mastery"]> = {};
      for (const tp of sess.topics.filter((x) => x.studentId === st.id)) existing[tp.enrolmentTopicId] = tp.mastery;
      const logged = sess.topics.filter((x) => x.studentId === st.id).map((x) => x.enrolmentTopicId);
      const preselected = logged.length ? logged : ws.allTopics.filter((x) => x.isCurrent).map((x) => x.id);
      return { id: st.id, name: st.name, topics: ws.allTopics.filter((x) => x.inScope).map((x) => ({ id: x.id, name: x.name, code: x.code, sectionName: x.sectionName, mastery: x.mastery, isCurrent: x.isCurrent })), preselected, nextSteps: ws.nextSteps.map((n) => ({ id: n.id, text: n.text })), assessment: st.assessment, existing, ws };
    }),
  );
  const isFuture = sess.startsAt.getTime() > Date.now();
  const labels = {
    markCompleted: t("tutor.markCompleted"), markNoShow: t("tutor.markNoShow"), nextSteps: t("tutor.nextSteps"), topicsCovered: t("tutor.topicsCovered"), search: t("common.search"), topicNote: "note (optional)",
    assessment: "How did it go? (private)", assessmentHint: "e.g. Rushed the last question; confidence up.", assignHomework: t("tutor.assignHomework"), hwTitle: "Homework title", dueIn: "Due in", hwInstructions: "Instructions (optional)",
    sharedSummary: t("tutor.sharedSummary"), sharedHint: "e.g. Expanding double brackets — every question right.", planForNext: t("tutor.planForNext"), planHint: "Becomes a next step automatically", privateNotes: t("tutor.privateNotes"), save: t("common.save"),
    m_needs_work: t("mastery.needs_work"), m_developing: t("mastery.developing"), m_comfortable: t("mastery.comfortable"), m_strong: t("mastery.strong"),
  };
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        eyebrow={t("common.session")}
        title={sess.students.map((x) => x.name).join(" & ")}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {formatDayLong(sess.startsAt)} · {formatTime(sess.startsAt)} · {minutesLabel(sess.durationMinutes)} · {sess.mode === "online" ? t("common.online") : sess.location}
            <StatusBadge status={sess.status} />
            {sess.needsLog && <Badge tone="warn">{t("tutor.needsLogging")}</Badge>}
          </span>
        }
      />

      {blocks.map((b) => (
        <div key={b.id} className="flex flex-wrap gap-2 text-sm">
          <span className="text-mute">Last time:</span>
          <span>{b.ws.lastLogged?.sharedSummary ?? "—"}</span>
          {b.ws.lastLogged?.planForNext && <span className="text-ink-600">→ Plan: {b.ws.lastLogged.planForNext}</span>}
        </div>
      ))}

      {sess.status === "scheduled" || sess.status === "completed" || sess.status === "no_show" ? (
        <SessionLogForm action={logSessionAction} sessionId={sess.id} students={blocks.map(({ ws: _ws, ...rest }) => rest)} defaults={{ sharedSummary: sess.sharedSummary ?? "", privateNotes: sess.privateNotes ?? "", planForNext: sess.planForNext ?? "", status: sess.status }} labels={labels} />
      ) : (
        <Card>
          <p className="text-sm">
            This session is <strong>{t(`status.${sess.status}`)}</strong>.{sess.packageOverrideReason && ` Package override: ${sess.packageOverrideReason}.`}
          </p>
        </Card>
      )}

      <Card title="Change status" subtitle="Cancellations inside the 24-hour window count against the package unless overridden.">
        <div className="flex flex-wrap gap-2">
          {(["cancelled_by_family", "cancelled_by_tutor", "scheduled"] as const).map((st) => (
            <form key={st} action={sessionStatusAction}>
              <input type="hidden" name="sessionId" value={sess.id} />
              <input type="hidden" name="status" value={st} />
              <input type="hidden" name="back" value={`/tutor/sessions/${sess.id}`} />
              <button className="btn-secondary btn-sm" type="submit">{st === "scheduled" ? "Reopen as scheduled" : t(`status.${st}`)}</button>
            </form>
          ))}
        </div>
        <form action={sessionStatusAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="sessionId" value={sess.id} />
          <input type="hidden" name="status" value={sess.status} />
          <input type="hidden" name="back" value={`/tutor/sessions/${sess.id}`} />
          <Field label="Package override">
            <select name="override" className="input" defaultValue={sess.countsAgainstPackage === null ? "null" : String(sess.countsAgainstPackage)}>
              <option value="null">Follow the rules</option>
              <option value="true">Counts against package</option>
              <option value="false">Does not count</option>
            </select>
          </Field>
          <Field label="Reason"><input name="reason" className="input" defaultValue={sess.packageOverrideReason ?? ""} placeholder="required for overrides" /></Field>
          <button className="btn-secondary" type="submit">{t("common.save")}</button>
        </form>
        {(isFuture || sess.status === "scheduled") && (
          <form action={rescheduleAction} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="sessionId" value={sess.id} />
            <input type="hidden" name="back" value="/tutor/calendar" />
            <Field label={t("tutor.reschedule")}><input name="date" type="date" className="input" defaultValue={toDateKey(sess.startsAt)} required /></Field>
            <Field label={t("common.time")}><input name="time" type="time" className="input" defaultValue={formatTime24(sess.startsAt)} required /></Field>
            <button className="btn-secondary" type="submit">{t("tutor.reschedule")}</button>
          </form>
        )}
      </Card>
    </div>
  );
}
