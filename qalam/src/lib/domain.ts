// Pure domain rules: mastery, coverage, revision, package counting.
// No database access here so the rules are trivially testable.
import type { Mastery, RevisionStatus, SessionStatus } from "@/db/schema";

export const MASTERY_ORDER: Record<Mastery, number> = { not_started: 0, needs_work: 1, developing: 2, comfortable: 3, strong: 4 };
export const MASTERY_TONE: Record<Mastery, "neutral" | "danger" | "warn" | "info" | "success"> = {
  not_started: "neutral",
  needs_work: "danger",
  developing: "warn",
  comfortable: "info",
  strong: "success",
};

export type TopicView = {
  id: string;
  name: string;
  code: string | null;
  sectionName: string | null;
  inScope: boolean;
  isCurrent: boolean;
  mastery: Mastery | null;
  sortOrder: number;
};

export type Coverage = { percent: number; total: number; covered: number; completed: number; current: number; needsRevision: number; notCovered: number };

/** Coverage = share of in-scope topics that have been taught (any mastery beyond not started). */
export function computeCoverage(topics: TopicView[]): Coverage {
  const inScope = topics.filter((t) => t.inScope);
  const total = inScope.length;
  let completed = 0,
    current = 0,
    needsRevision = 0,
    notCovered = 0,
    covered = 0;
  for (const t of inScope) {
    const m = t.mastery ?? "not_started";
    if (m !== "not_started") covered++;
    if (m === "strong" || m === "comfortable") completed++;
    else if (m === "developing" || (t.isCurrent && m === "not_started")) current++;
    else if (m === "needs_work") needsRevision++;
    else notCovered++;
  }
  return { percent: total ? Math.round((covered / total) * 100) : 0, total, covered, completed, current, needsRevision, notCovered };
}

export function strengths(topics: TopicView[], limit = 3) {
  return topics.filter((t) => t.mastery === "strong").slice(0, limit);
}
export function weaknesses(topics: TopicView[], limit = 3) {
  return topics.filter((t) => t.mastery === "needs_work").slice(0, limit);
}

/** Revision status for a test topic: explicit tutor status wins; otherwise derived from mastery. */
export function deriveRevision(explicit: RevisionStatus | null, mastery: Mastery | null): RevisionStatus {
  if (explicit) return explicit;
  switch (mastery) {
    case "strong":
    case "comfortable":
      return "revised";
    case "developing":
      return "in_progress";
    case "needs_work":
      return "needs_work";
    default:
      return "not_started";
  }
}
export const REVISION_GLYPH: Record<RevisionStatus, string> = { revised: "✓", in_progress: "◐", needs_work: "!", not_started: "○" };

export function revisionProgress(statuses: RevisionStatus[]) {
  const total = statuses.length;
  const revised = statuses.filter((s) => s === "revised").length;
  const half = statuses.filter((s) => s === "in_progress").length;
  return { total, revised, unrevised: total - revised, percent: total ? Math.round(((revised + half * 0.5) / total) * 100) : 0 };
}

/** Homework "overdue" is derived, never stored. */
export function effectiveHomeworkStatus(status: string, dueAt: Date, now = new Date()): string {
  const openStates = ["assigned", "in_progress", "corrections_requested"];
  if (openStates.includes(status) && dueAt.getTime() < now.getTime()) return "overdue";
  return status;
}

export type PackageSession = {
  status: SessionStatus;
  startsAt: Date;
  cancelledAt: Date | null;
  countsAgainstPackage: boolean | null;
};

/**
 * Package rules:
 *  - completed and no-show count
 *  - tutor-cancelled, rescheduled and future scheduled never count
 *  - family cancellations inside the late-cancellation window count
 *  - a tutor override (true/false) always wins
 */
export function sessionCounts(s: PackageSession, lateCancellationHours: number): boolean {
  if (s.countsAgainstPackage !== null) return s.countsAgainstPackage;
  switch (s.status) {
    case "completed":
    case "no_show":
      return true;
    case "cancelled_by_family": {
      if (!s.cancelledAt) return false;
      const hoursBefore = (s.startsAt.getTime() - s.cancelledAt.getTime()) / 3600000;
      return hoursBefore < lateCancellationHours;
    }
    default:
      return false;
  }
}

export function packageUsage(total: number, sessions: PackageSession[], lateCancellationHours: number) {
  const used = sessions.filter((s) => sessionCounts(s, lateCancellationHours)).length;
  const scheduled = sessions.filter((s) => s.status === "scheduled").length;
  return { total, used, remaining: Math.max(0, total - used), scheduled, low: total - used <= 2 };
}

export function homeworkCompletionRate(items: { status: string; dueAt: Date }[]) {
  const due = items.filter((h) => h.dueAt.getTime() < Date.now());
  if (!due.length) return null;
  return Math.round((due.filter((h) => h.status === "completed").length / due.length) * 100);
}
