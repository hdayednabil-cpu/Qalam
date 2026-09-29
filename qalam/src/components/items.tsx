import Link from "next/link";
import { Clock, MapPin, Video, AlertTriangle, Info, Flame, CheckCircle2, Circle } from "lucide-react";
import type { SessionView, HomeworkView, AssessmentView, Alert } from "@/lib/queries";
import type { TopicView } from "@/lib/domain";
import { formatDayShort, formatTime, minutesLabel, relativeDays, daysUntil, toDateKey, formatDate } from "@/lib/dates";
import { t, statusLabel, revisionLabel } from "@/lib/i18n";
import { Badge, MasteryDot, StatusBadge, cx, Progress } from "./ui";
import { REVISION_GLYPH } from "@/lib/domain";

export function SessionRow({ s, href, showStudents = true, compact = false }: { s: SessionView; href?: string; showStudents?: boolean; compact?: boolean }) {
  const inner = (
    <div className={cx("flex items-start gap-3", compact ? "py-3" : "py-4")}>
      <div className="w-14 shrink-0 rounded-xl border border-line bg-paper py-2 text-center">
        <div className="text-xs text-mute">{formatDayShort(s.startsAt).split(" ")[0]}</div>
        <div className="text-lg font-semibold leading-tight tabular-nums display">{formatDayShort(s.startsAt).split(" ")[1]}</div>
        <div className="text-[11px] text-mute">{formatDayShort(s.startsAt).split(" ")[2]}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {showStudents && <span className="font-semibold">{s.students.map((x) => x.name).join(" & ")}</span>}
          <span className="text-sm text-mute tabular-nums">
            {formatTime(s.startsAt)} · {minutesLabel(s.durationMinutes)}
          </span>
          {s.needsLog ? <Badge tone="warn">{t("tutor.needsLogging")}</Badge> : s.status !== "scheduled" && s.status !== "completed" ? <StatusBadge status={s.status} /> : null}
          {s.mode === "online" ? (
            <span className="inline-flex items-center gap-1 text-xs text-mute">
              <Video size={12} /> {t("common.online")}
            </span>
          ) : s.location ? (
            <span className="inline-flex items-center gap-1 text-xs text-mute">
              <MapPin size={12} /> {s.location}
            </span>
          ) : null}
        </div>
        {s.sharedSummary && <p className="mt-1 text-sm text-ink-800 line-clamp-2">{s.sharedSummary}</p>}
        {s.topics.length > 0 && !compact && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {s.topics.map((tp, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                <MasteryDot level={tp.mastery} /> {tp.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-xl -mx-2 px-2 hover:bg-ink-50/60">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function HomeworkRow({ h, href, studentName }: { h: HomeworkView; href: string; studentName?: string }) {
  const dueIn = daysUntil(toDateKey(h.dueAt));
  const open = ["assigned", "in_progress", "corrections_requested", "overdue"].includes(h.effectiveStatus);
  return (
    <Link href={href} className="flex items-start gap-3 rounded-xl -mx-2 px-2 py-4 hover:bg-ink-50/60">
      <div className={cx("mt-0.5 size-8 shrink-0 rounded-lg grid place-items-center", h.effectiveStatus === "overdue" ? "bg-coral-100 text-coral-600" : h.effectiveStatus === "completed" ? "bg-moss-100 text-moss-600" : h.effectiveStatus === "submitted" || h.effectiveStatus === "resubmitted" ? "bg-saffron-100 text-saffron-600" : "bg-ink-50 text-ink-600")}>
        {h.effectiveStatus === "completed" ? <CheckCircle2 size={16} /> : h.priority === "high" ? <Flame size={16} /> : <Circle size={16} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {studentName && <span className="text-sm text-mute">{studentName} ·</span>}
          <span className="font-medium">{h.title}</span>
          <StatusBadge status={h.effectiveStatus} />
        </div>
        <div className="mt-0.5 text-xs text-mute flex flex-wrap gap-x-3">
          <span className={cx(open && dueIn < 0 && "text-coral-600 font-medium")}>
            {t("common.due")} {formatDayShort(h.dueAt)} ({relativeDays(dueIn)})
          </span>
          {h.score && <span>{t("common.score")}: {h.score}</span>}
          {h.latestSubmission && <span>v{h.latestSubmission.version} · {h.latestSubmission.pageCount} pages</span>}
          {h.topics.length > 0 && <span>{h.topics.map((x) => x.name).join(", ")}</span>}
        </div>
      </div>
    </Link>
  );
}

export function TestRow({ a, href, studentName }: { a: AssessmentView; href?: string; studentName?: string }) {
  const past = a.daysUntil < 0;
  const body = (
    <div className="py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {studentName && <span className="text-sm text-mute">{studentName} ·</span>}
        <span className="font-medium">{a.name}</span>
        {a.subject && <Badge tone="brand">{a.subject}</Badge>}
        {a.priority === "high" && !past && <Badge tone="danger">{t("common.high")}</Badge>}
        <span className={cx("text-sm", !past && a.daysUntil <= 7 ? "text-coral-600 font-medium" : "text-mute")}>
          {formatDate(a.date)} · {relativeDays(a.daysUntil)}
        </span>
      </div>
      {a.result ? (
        <div className="mt-1 text-sm">
          Result: <span className="font-semibold">{a.result.result}</span>
          {a.result.sharedComment && <span className="text-mute"> — {a.result.sharedComment}</span>}
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-3">
          <Progress value={a.revision.percent} tone={a.revision.percent >= 70 ? "success" : a.revision.percent >= 40 ? "warn" : "danger"} className="max-w-xs" />
          <span className="text-xs text-mute whitespace-nowrap">
            {a.revision.revised}/{a.revision.total} revised
          </span>
        </div>
      )}
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-xl -mx-2 px-2 hover:bg-ink-50/60">
      {body}
    </Link>
  ) : (
    body
  );
}

export function RevisionRow({ tp }: { tp: AssessmentView["topics"][number] }) {
  const tone = tp.status === "revised" ? "text-moss-600" : tp.status === "needs_work" ? "text-coral-600" : tp.status === "in_progress" ? "text-saffron-600" : "text-stone-400";
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className={cx("w-5 text-center font-bold", tone)}>{REVISION_GLYPH[tp.status]}</span>
      <span className="flex-1 text-sm">{tp.name}</span>
      <span className={cx("text-xs", tone)}>{revisionLabel(tp.status)}</span>
    </div>
  );
}

export function AlertList({ alerts, className }: { alerts: Alert[]; className?: string }) {
  if (!alerts.length) return null;
  return (
    <ul className={cx("space-y-1.5", className)}>
      {alerts.map((a, i) => (
        <li key={i} className={cx("flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-sm", a.severity === "danger" ? "bg-coral-100 text-coral-700" : a.severity === "warn" ? "bg-saffron-100 text-saffron-700" : "bg-sky-100 text-sky-700")}>
          {a.severity === "info" ? <Info size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
          {a.link ? (
            <Link href={a.link} className="hover:underline">
              {a.text}
            </Link>
          ) : (
            <span>{a.text}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function TopicChips({ topics, empty }: { topics: TopicView[]; empty?: string }) {
  if (!topics.length) return <span className="text-sm text-mute">{empty ?? t("common.none")}</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {topics.map((tp) => (
        <span key={tp.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">
          <MasteryDot level={tp.mastery} /> {tp.name}
        </span>
      ))}
    </div>
  );
}

export function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-mute">
      {(["strong", "comfortable", "developing", "needs_work", "not_started"] as const).map((l) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <MasteryDot level={l} /> {t(`mastery.${l}`)}
        </span>
      ))}
    </div>
  );
}

export function ClockLine({ s }: { s: SessionView }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-mute">
      <Clock size={14} /> {formatDayShort(s.startsAt)} · {formatTime(s.startsAt)}
    </span>
  );
}

export function statusLabelSafe(sv: string) {
  return statusLabel(sv);
}
