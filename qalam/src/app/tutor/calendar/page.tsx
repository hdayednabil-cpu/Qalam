import Link from "next/link";
import { getDb } from "@/db";
import { requireUser } from "@/lib/auth";
import { listBlackouts, listStudents, sessionsBetween } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { addDaysKey, formatDate, formatDayShort, formatTime, isInBlackout, minutesLabel, startOfWeekKey, toDateKey, todayKey, WEEKDAYS_SHORT, formatMonthYear } from "@/lib/dates";
import { Badge, Card, EmptyState, Field, LinkButton, PageHeader, StatusBadge, cx } from "@/components/ui";
import { blackoutAction, createSessionAction, generateSessionsAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await searchParams;
  const user = await requireUser("tutor");
  const db = getDb();
  const today = todayKey();
  const start = startOfWeekKey(week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : today);
  const end = addDaysKey(start, 6);
  const sessions = await sessionsBetween(db, user, start, end);
  const blackouts = await listBlackouts(db, user.tutorId);
  const students = await listStudents(db, user);
  const days = Array.from({ length: 7 }, (_, i) => addDaysKey(start, i));
  const byDay = new Map(days.map((d) => [d, sessions.filter((s) => toDateKey(s.startsAt) === d)]));
  const upcoming = (await sessionsBetween(db, user, today, addDaysKey(today, 21))).filter((s) => s.status === "scheduled" && s.endsAt.getTime() > Date.now()).slice(0, 12);
  const isFriSat = (d: string) => [5, 6].includes(new Date(d + "T12:00:00Z").getUTCDay());
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.calendar")}
        subtitle={`${t("tutor.week")} of ${formatDate(start)} · ${formatMonthYear(start)} · working days Sun–Thu, hours 2 PM–10 PM`}
        action={
          <>
            <LinkButton href={`/tutor/calendar?week=${addDaysKey(start, -7)}`}>←</LinkButton>
            <LinkButton href="/tutor/calendar">{t("common.today")}</LinkButton>
            <LinkButton href={`/tutor/calendar?week=${addDaysKey(start, 7)}`}>→</LinkButton>
            <form action={generateSessionsAction}><button className="btn-secondary" type="submit">{t("tutor.generateSessions")}</button></form>
          </>
        }
      />

      <div className="grid gap-2 md:grid-cols-7">
        {days.map((d) => {
          const list = byDay.get(d)!;
          const off = isInBlackout(d, blackouts);
          return (
            <div key={d} className={cx("card p-2.5 min-h-28", d === today && "ring-2 ring-saffron-400", (off || isFriSat(d)) && "bg-stone-50")}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className={cx("text-xs font-semibold", d === today ? "text-saffron-700" : "text-mute")}>{WEEKDAYS_SHORT[new Date(d + "T12:00:00Z").getUTCDay()]}</span>
                <span className="text-sm font-semibold display">{d.slice(8)}</span>
              </div>
              {off && <Badge tone="neutral">{blackouts.find((b) => d >= b.startDate && d <= b.endDate)?.reason}</Badge>}
              <div className="space-y-1">
                {list.map((s) => (
                  <Link key={s.id} href={`/tutor/sessions/${s.id}`} className={cx("block rounded-lg px-2 py-1 text-xs leading-tight", s.status === "completed" ? "bg-moss-100 text-moss-700" : s.needsLog ? "bg-saffron-100 text-saffron-700" : s.status === "scheduled" ? "bg-ink-50 text-ink-800" : "bg-stone-100 text-mute line-through")}>
                    <div className="font-semibold tabular-nums">{formatTime(s.startsAt)}</div>
                    <div>{s.students.map((x) => x.name).join(" & ")}</div>
                  </Link>
                ))}
                {!list.length && !off && <div className="text-[11px] text-stone-300">—</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card title={t("tutor.upcoming")} subtitle="Next three weeks">
          {upcoming.length ? (
            <div className="divide-y divide-line/70">
              {upcoming.map((s) => (
                <Link key={s.id} href={`/tutor/sessions/${s.id}`} className="flex items-center gap-3 py-2 text-sm hover:bg-ink-50/60 -mx-2 px-2 rounded-lg">
                  <span className="w-28 tabular-nums text-mute">{formatDayShort(s.startsAt)} {formatTime(s.startsAt)}</span>
                  <span className="flex-1 font-medium">{s.students.map((x) => x.name).join(" & ")}</span>
                  <span className="text-xs text-mute">{minutesLabel(s.durationMinutes)} · {s.mode === "online" ? t("common.online") : s.location}</span>
                  <StatusBadge status={s.status} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState>{t("empty.noSessions")}</EmptyState>
          )}
        </Card>
        <div className="space-y-6">
          <Card title="Add a one-off session">
            <form action={createSessionAction} className="grid grid-cols-2 gap-3">
              <Field label={t("nav.students")} className="col-span-2">
                <select name="studentId" className="input" multiple size={4}>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
              </Field>
              <Field label={t("common.date")}><input name="date" type="date" className="input" defaultValue={today} required /></Field>
              <Field label={t("common.time")}><input name="time" type="time" className="input" defaultValue="16:00" required /></Field>
              <Field label={t("common.duration")}><input name="minutes" type="number" className="input" defaultValue={60} step={15} /></Field>
              <Field label={t("common.mode")}>
                <select name="mode" className="input"><option value="in_person">{t("common.inPerson")}</option><option value="online">{t("common.online")}</option></select>
              </Field>
              <Field label={t("common.location")} className="col-span-2"><input name="location" className="input" placeholder="Student's home" /></Field>
              <button className="btn-primary col-span-2" type="submit">{t("common.add")}</button>
            </form>
          </Card>
          <Card title={t("tutor.blackouts")} subtitle="Sessions inside a blackout are cancelled as tutor-cancelled (never counted).">
            <ul className="space-y-1 text-sm mb-3">
              {blackouts.map((b) => (
                <li key={b.id} className="flex items-center justify-between">
                  <span>{formatDate(b.startDate)} – {formatDate(b.endDate)} · {b.reason}</span>
                  <form action={blackoutAction}><input type="hidden" name="remove" value={b.id} /><button className="btn-ghost btn-sm" type="submit">{t("common.delete")}</button></form>
                </li>
              ))}
              {!blackouts.length && <li className="text-mute">{t("common.none")}</li>}
            </ul>
            <form action={blackoutAction} className="grid grid-cols-2 gap-2">
              <input name="start" type="date" className="input" required />
              <input name="end" type="date" className="input" />
              <input name="reason" className="input col-span-2" placeholder="Reason (e.g. Eid break)" required />
              <button className="btn-secondary col-span-2" type="submit">{t("common.add")}</button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
