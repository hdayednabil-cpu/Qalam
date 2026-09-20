import Link from "next/link";
import { getDb } from "@/db";
import { requireUser } from "@/lib/auth";
import { getTutorDashboard } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { formatDayLong, todayKey } from "@/lib/dates";
import { Card, EmptyState, Stat, Avatar, LinkButton, Badge } from "@/components/ui";
import { SessionRow, HomeworkRow, TestRow, AlertList } from "@/components/items";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { nextStepAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TutorDashboard() {
  const user = await requireUser("tutor");
  const d = await getTutorDashboard(getDb(), user);
  return (
    <div className="space-y-6">
      <div className="fade-up">
        <div className="label">{formatDayLong(todayKey())}</div>
        <h1 className="text-2xl md:text-3xl font-semibold">{t("tutor.attention")}</h1>
      </div>

      <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StaggerItem><Stat label={t("tutor.needsLogging")} value={d.needsLog.length} tone={d.needsLog.length ? "warn" : undefined} /></StaggerItem>
        <StaggerItem><Stat label={t("tutor.awaitingReview")} value={d.awaitingReview.length} tone={d.awaitingReview.length ? "warn" : undefined} /></StaggerItem>
        <StaggerItem><Stat label={t("tutor.overdueHomework")} value={d.overdue.length} tone={d.overdue.length ? "danger" : undefined} /></StaggerItem>
        <StaggerItem><Stat label={t("common.package")} value={d.indicators.lowPackages} hint="running low" tone={d.indicators.lowPackages ? "warn" : undefined} /></StaggerItem>
      </Stagger>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Reveal className="space-y-6">
          <Card title={t("tutor.todaysSessions")} action={<LinkButton href="/tutor/calendar" variant="ghost">{t("nav.calendar")} →</LinkButton>}>
            {d.todays.length ? (
              <div className="divide-y divide-line/70">
                {d.todays.map((s) => (
                  <SessionRow key={s.id} s={s} href={`/tutor/sessions/${s.id}`} />
                ))}
              </div>
            ) : (
              <EmptyState>{t("tutor.noSessionsToday")}</EmptyState>
            )}
          </Card>

          {d.needsLog.length > 0 && (
            <Card title={t("tutor.needsLogging")} subtitle="Time has passed — log these while they are fresh.">
              <div className="divide-y divide-line/70">
                {d.needsLog.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <SessionRow s={s} compact />
                    </div>
                    <LinkButton href={`/tutor/sessions/${s.id}`} variant="primary" className="btn-sm">
                      {t("tutor.logSession")}
                    </LinkButton>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title={t("tutor.awaitingReview")}>
            {d.awaitingReview.length ? (
              <div className="divide-y divide-line/70">
                {d.awaitingReview.map((h) => (
                  <HomeworkRow key={h.id} h={h} href={`/tutor/homework/${h.id}`} studentName={h.studentName} />
                ))}
              </div>
            ) : (
              <EmptyState>{t("common.allCaughtUp")}</EmptyState>
            )}
          </Card>

          <Card title={t("tutor.upcomingTests")}>
            {d.upcomingTests.length ? (
              <div className="divide-y divide-line/70">
                {d.upcomingTests.map((a) => (
                  <TestRow key={a.id} a={a} href={`/tutor/tests/${a.id}`} studentName={a.studentName} />
                ))}
              </div>
            ) : (
              <EmptyState>{t("empty.noTests")}</EmptyState>
            )}
          </Card>
        </Reveal>

        <Reveal className="space-y-6" delay={0.12}>
          <Card title={t("tutor.studentsNeedingAttention")}>
            {d.attention.length ? (
              <div className="space-y-4">
                {d.attention.map((st) => (
                  <div key={st.id}>
                    <Link href={`/tutor/students/${st.id}`} className="flex items-center gap-2 mb-1.5 font-semibold hover:underline">
                      <Avatar name={st.name} hue={st.hue} size={26} /> {st.name}
                    </Link>
                    <AlertList alerts={st.alerts} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>{t("common.allCaughtUp")}</EmptyState>
            )}
          </Card>

          {d.overdue.length > 0 && (
            <Card title={t("tutor.overdueHomework")}>
              <div className="divide-y divide-line/70">
                {d.overdue.map((h) => (
                  <HomeworkRow key={h.id} h={h} href={`/tutor/homework/${h.id}`} studentName={h.studentName} />
                ))}
              </div>
            </Card>
          )}

          <Card title={t("tutor.upcoming")} subtitle={t("tutor.thisWeek")}>
            {d.week.length ? (
              <div className="divide-y divide-line/70">
                {d.week.slice(0, 8).map((s) => (
                  <SessionRow key={s.id} s={s} href={`/tutor/sessions/${s.id}`} compact />
                ))}
              </div>
            ) : (
              <EmptyState>{t("empty.noSessions")}</EmptyState>
            )}
            <div className="mt-3 flex gap-4 text-xs text-mute">
              <span>
                <Badge tone="success">{d.indicators.sessionsThisWeek}</Badge> {t("tutor.sessionsCompleted")} in the last 7 days
              </span>
              {d.indicators.homeworkCompletion !== null && <span>Homework completion {d.indicators.homeworkCompletion}%</span>}
            </div>
          </Card>

          <Card title={t("tutor.nextActions")}>
            {d.nextActions.length ? (
              <ul className="space-y-2">
                {d.nextActions.map((n) => (
                  <li key={n.id} className="flex items-start gap-2 text-sm">
                    <form action={nextStepAction}>
                      <input type="hidden" name="done" value={n.id} />
                      <button className="mt-0.5 size-4 rounded-full border-2 border-ink-300 hover:bg-moss-100" title={t("common.markDone")} type="submit" />
                    </form>
                    <span>
                      <span className="text-mute">{n.studentName}: </span>
                      {n.text}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>{t("empty.noSteps")}</EmptyState>
            )}
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
