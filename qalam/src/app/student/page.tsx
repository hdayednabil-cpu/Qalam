import Link from "next/link";
import { getDb } from "@/db";
import { getViewer } from "@/lib/auth";
import { canSee } from "@/lib/access";
import { getWorkspace } from "@/lib/queries";
import { strengths, weaknesses } from "@/lib/domain";
import { t } from "@/lib/i18n";
import { formatDayShort, formatTime, relativeDays, daysUntil, toDateKey } from "@/lib/dates";
import { Card, EmptyState, LinkButton } from "@/components/ui";
import { HomeworkRow, RevisionRow, TopicChips } from "@/components/items";
import { Reveal, MotionRing, MotionProgress } from "@/components/motion";

export const dynamic = "force-dynamic";

export default async function StudentHome() {
  const v = await getViewer("student");
  const ws = await getWorkspace(getDb(), v.user, v.studentId!);
  const name = ws.displayName;
  const open = ws.homework.filter((h) => ["assigned", "in_progress", "corrections_requested", "overdue"].includes(h.effectiveStatus)).sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  const nextTest = ws.assessments.find((a) => a.daysUntil >= 0 && !a.result) ?? null;
  const practise = weaknesses(ws.allTopics, 4);
  const recentDone = ws.homework.filter((h) => h.status === "completed" && h.score).slice(0, 3);
  const strong = strengths(ws.allTopics, 4);
  const notes = ws.feedback.filter((f) => canSee("student", f.visibility)).slice(0, 2);
  return (
    <div className="space-y-6">
      <div className="fade-up">
        <h1 className="text-2xl md:text-3xl font-semibold">{t("student.greeting", { name })} 👋</h1>
        <p className="text-mute">{t("student.question")}</p>
      </div>

      {ws.student.importantNote && (
        <div className="fade-up fade-up-1 rounded-2xl bg-saffron-100 border border-saffron-300 px-5 py-4">
          <div className="label mb-1">{t("student.tutorNote")}</div>
          <p className="text-ink-900">{ws.student.importantNote}</p>
        </div>
      )}

      <Reveal className="grid gap-4 md:grid-cols-3">
        <Card title={t("student.nextSession")} className="md:col-span-1">
          {ws.nextSession ? (
            <div>
              <div className="text-2xl font-semibold display">{formatDayShort(ws.nextSession.startsAt)}</div>
              <div className="text-mute">{formatTime(ws.nextSession.startsAt)} · {relativeDays(daysUntil(toDateKey(ws.nextSession.startsAt)))}</div>
              {ws.nextSession.mode === "online" && ws.nextSession.meetingLink && <a className="btn-secondary btn-sm mt-3" href={ws.nextSession.meetingLink} target="_blank" rel="noreferrer">Join online</a>}
              {ws.lastLogged?.planForNext && <p className="mt-3 text-sm"><span className="text-mute">Plan: </span>{ws.lastLogged.planForNext}</p>}
            </div>
          ) : (
            <EmptyState>{t("empty.noSessions")}</EmptyState>
          )}
        </Card>
        <Card title={t("student.currentHomework")} className="md:col-span-2" action={<LinkButton href="/student/homework" variant="ghost">{t("common.viewAll")} →</LinkButton>}>
          {open.length ? <div className="divide-y divide-line/70">{open.slice(0, 3).map((h) => <HomeworkRow key={h.id} h={h} href={`/student/homework/${h.id}`} />)}</div> : <EmptyState>{t("student.noHomework")}</EmptyState>}
        </Card>
      </Reveal>

      <Reveal className="grid gap-4 md:grid-cols-2" delay={0.08}>
        <Card title={t("student.upcomingTest")}>
          {nextTest ? (
            <div>
              <div className="flex items-center gap-4">
                <MotionRing value={nextTest.revision.percent} tone={nextTest.revision.percent >= 70 ? "success" : "warn"} />
                <div>
                  <div className="font-semibold text-lg">{nextTest.name}</div>
                  <div className="text-sm text-mute">{relativeDays(nextTest.daysUntil)} · {nextTest.revision.revised}/{nextTest.revision.total} revised</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="label mb-1">{t("student.stillToRevise")}</div>
                {nextTest.topics.filter((x) => x.status !== "revised").length ? nextTest.topics.filter((x) => x.status !== "revised").map((tp) => <RevisionRow key={tp.enrolmentTopicId} tp={tp} />) : <p className="text-sm text-moss-700">{t("student.allRevised")}</p>}
              </div>
              <Link href="/student/tests" className="mt-2 inline-block text-sm text-ink-700 hover:underline">{t("student.revisionProgress")} →</Link>
            </div>
          ) : (
            <EmptyState>{t("empty.noTests")}</EmptyState>
          )}
        </Card>
        <Card title={t("student.lastSession")}>
          {ws.lastLogged ? (
            <div>
              <div className="text-xs text-mute mb-1">{formatDayShort(ws.lastLogged.startsAt)}</div>
              <p className="text-ink-900">{ws.lastLogged.sharedSummary}</p>
              <div className="mt-3"><TopicChips topics={ws.allTopics.filter((tp) => ws.lastLogged!.topics.some((x) => x.enrolmentTopicId === tp.id))} /></div>
            </div>
          ) : (
            <EmptyState>{t("empty.noSessions")}</EmptyState>
          )}
          {ws.enrolments.map((e) => e.currentTopic && (
            <p key={e.id} className="mt-3 text-sm"><span className="text-mute">{t("student.currentTopic")} ({e.subject}): </span><span className="font-medium">{e.currentTopic.name}</span></p>
          ))}
        </Card>
      </Reveal>

      <Reveal className="grid gap-4 md:grid-cols-3" delay={0.12}>
        <Card title={t("student.practice")}><TopicChips topics={practise} empty="Nothing flagged — keep going." /></Card>
        <Card title={t("student.achievements")}>
          <ul className="space-y-1.5 text-sm">
            {strong.slice(0, 2).map((tp) => <li key={tp.id}>⭐ {tp.name} — strong</li>)}
            {recentDone.map((h) => <li key={h.id}>✅ {h.title} — {h.score}</li>)}
            {!strong.length && !recentDone.length && <li className="text-mute">{t("common.nothingHere")}</li>}
          </ul>
        </Card>
        <Card title={t("nav.progress")}>
          {ws.enrolments.map((e) => <MotionProgress key={e.id} value={e.coverage.percent} label={e.subject} className="mb-2" />)}
          <Link href="/student/progress" className="text-sm text-ink-700 hover:underline">{t("common.viewAll")} →</Link>
        </Card>
      </Reveal>

      {notes.length > 0 && (
        <Card title={t("nav.feedback")}>
          <ul className="space-y-2 text-sm">{notes.map((f) => <li key={f.id}><span className="text-xs text-mute">{formatDayShort(f.createdAt)} · </span>{f.body}</li>)}</ul>
        </Card>
      )}
    </div>
  );
}
