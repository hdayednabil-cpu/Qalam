import Link from "next/link";
import { canSee } from "@/lib/access";
import { strengths, weaknesses } from "@/lib/domain";
import { t } from "@/lib/i18n";
import { formatDayShort, formatTime, formatMonthYear, todayKey, relativeDays } from "@/lib/dates";
import { Card, EmptyState, Stat, cx } from "@/components/ui";
import { HomeworkRow, RevisionRow, SessionRow, TopicChips } from "@/components/items";
import { Reveal, Stagger, StaggerItem, MotionRing, MotionProgress } from "@/components/motion";
import { currentChild } from "./child";
import { ChildSwitcher } from "./child-switcher";

export const dynamic = "force-dynamic";

export default async function ParentHome() {
  const { kids, child, ws } = await currentChild();
  const name = ws.displayName;
  const open = ws.homework.filter((h) => ["assigned", "in_progress", "corrections_requested", "overdue"].includes(h.effectiveStatus));
  const waiting = ws.homework.filter((h) => h.effectiveStatus === "submitted" || h.effectiveStatus === "resubmitted");
  const nextTest = ws.assessments.find((a) => a.daysUntil >= 0 && !a.result) ?? null;
  const feedback = ws.feedback.filter((f) => canSee("guardian", f.visibility)).slice(0, 3);
  const monthLabel = formatMonthYear(todayKey());
  return (
    <div className="space-y-6">
      <ChildSwitcher kids={kids} currentId={child.id} back="/parent" />
      <div className="fade-up">
        <h1 className="text-2xl md:text-3xl font-semibold">{t("parent.question", { name })}</h1>
        <p className="text-mute">{ws.student.gradeYear} · {ws.student.school} · {ws.enrolments.map((e) => e.subject).join(", ")}</p>
      </div>

      <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StaggerItem><Stat label={`${t("parent.monthOverview")} · ${monthLabel}`} value={ws.stats.sessionsThisMonth} hint={`${t("common.sessions").toLowerCase()} ${t("parent.completed")} · ${ws.stats.upcomingThisMonth} ${t("parent.upcoming")}`} /></StaggerItem>
        <StaggerItem><Stat label={t("parent.package")} value={ws.pkg ? ws.pkg.remaining : "—"} hint={ws.pkg ? `${t("common.of")} ${ws.pkg.total} ${t("common.remaining")}${ws.pkg.shared ? " (family)" : ""}` : "No active package"} tone={ws.pkg?.low ? "warn" : undefined} /></StaggerItem>
        <StaggerItem><Stat label={t("parent.homework")} value={`${ws.homework.filter((h) => h.status === "completed").length}/${ws.homework.length}`} hint={`${open.length} ${t("parent.pending")} · ${waiting.length} awaiting review`} tone={open.some((h) => h.effectiveStatus === "overdue") ? "danger" : undefined} /></StaggerItem>
        <StaggerItem><Stat label="Attendance" value={ws.stats.attendance !== null ? `${ws.stats.attendance}%` : "—"} hint="completed vs no-show" /></StaggerItem>
      </Stagger>

      <Reveal className="grid gap-4 md:grid-cols-2">
        <Card title={t("parent.upcomingTest")}>
          {nextTest ? (
            <div>
              <div className="flex items-center gap-4">
                <MotionRing value={nextTest.revision.percent} tone={nextTest.revision.percent >= 70 ? "success" : "warn"} />
                <div>
                  <div className="font-semibold text-lg">{nextTest.name}</div>
                  <div className="text-sm text-mute">{formatDayShort(nextTest.date)} · {relativeDays(nextTest.daysUntil)}</div>
                  <div className="text-sm text-mute">{nextTest.revision.revised}/{nextTest.revision.total} topics revised</div>
                </div>
              </div>
              <div className="mt-3 divide-y divide-line/60">{nextTest.topics.map((tp) => <RevisionRow key={tp.enrolmentTopicId} tp={tp} />)}</div>
              <p className="mt-2 text-xs text-mute">{t("parent.readinessNote")}</p>
            </div>
          ) : (
            <EmptyState>{t("empty.noTests")}</EmptyState>
          )}
        </Card>
        <div className="space-y-4">
          <Card title={t("parent.nextSession")}>
            {ws.nextSession ? <SessionRow s={ws.nextSession} showStudents={false} compact /> : <EmptyState>{t("empty.noSessions")}</EmptyState>}
            {ws.lastLogged && (
              <div className="mt-3 border-t border-line/70 pt-3 text-sm">
                <div className="text-xs text-mute">Last session · {formatDayShort(ws.lastLogged.startsAt)} {formatTime(ws.lastLogged.startsAt)}</div>
                <p>{ws.lastLogged.sharedSummary}</p>
              </div>
            )}
          </Card>
          <Card title={t("parent.performance")}>
            {ws.enrolments.map((e) => <MotionProgress key={e.id} value={e.coverage.percent} label={`${e.subject} — ${t("tutor.coverage").toLowerCase()}`} className="mb-3" />)}
            <div className="grid gap-3 sm:grid-cols-2 mt-2">
              <div><div className="label mb-1">{t("parent.strengths")}</div><TopicChips topics={strengths(ws.allTopics)} empty="—" /></div>
              <div><div className="label mb-1">{t("parent.improve")}</div><TopicChips topics={weaknesses(ws.allTopics)} empty="—" /></div>
            </div>
          </Card>
        </div>
      </Reveal>

      <Reveal className="grid gap-4 md:grid-cols-2" delay={0.1}>
        <Card title={t("parent.homework")} action={<Link href="/parent/homework" className="text-sm text-ink-700 hover:underline">{t("common.viewAll")} →</Link>}>
          {open.length || waiting.length ? <div className="divide-y divide-line/70">{[...open, ...waiting].slice(0, 4).map((h) => <HomeworkRow key={h.id} h={h} href="/parent/homework" />)}</div> : <EmptyState>{t("empty.noHomework")}</EmptyState>}
        </Card>
        <Card title={t("parent.latestFeedback")} action={<Link href="/parent/feedback" className="text-sm text-ink-700 hover:underline">{t("common.viewAll")} →</Link>}>
          {feedback.length ? (
            <ul className="space-y-3">{feedback.map((f) => <li key={f.id} className={cx("rounded-xl px-3 py-2 text-sm", f.important ? "bg-saffron-100" : "bg-ink-50")}><div className="text-xs text-mute mb-0.5">{formatDayShort(f.createdAt)} · {f.authorName}</div>{f.body}</li>)}</ul>
          ) : (
            <EmptyState>{t("parent.noFeedback")}</EmptyState>
          )}
        </Card>
      </Reveal>
    </div>
  );
}
