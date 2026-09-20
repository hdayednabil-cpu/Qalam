import type { Workspace } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { Card, MasteryDot, Ring, cx } from "./ui";
import { StatusLegend } from "./items";

/** Curriculum coverage + mastery view shared by student and parent (no private data). */
export function ProgressView({ ws, showRings = true }: { ws: Workspace; showRings?: boolean }) {
  return (
    <div className="space-y-5">
      <StatusLegend />
      {ws.enrolments.map((e) => {
        const sections = new Map<string, typeof e.topics>();
        for (const tp of e.topics.filter((x) => x.inScope)) {
          const k = tp.sectionName ?? "Topics";
          if (!sections.has(k)) sections.set(k, []);
          sections.get(k)!.push(tp);
        }
        return (
          <Card key={e.id} title={e.subject} subtitle={e.templateName} action={showRings ? <Ring value={e.coverage.percent} size={56} stroke={6} tone={e.coverage.percent >= 60 ? "success" : "brand"} /> : undefined}>
            <div className="text-xs text-mute mb-3">
              {e.coverage.completed} {t("parent.covered").toLowerCase()} · {e.coverage.current} in progress · {e.coverage.needsRevision} to revise · {e.coverage.notCovered} {t("parent.remainingTopics").toLowerCase()}
            </div>
            <div className="space-y-3">
              {[...sections.entries()].map(([name, topics]) => (
                <div key={name}>
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <span>{name}</span>
                    <span className="flex gap-0.5 ml-auto">{topics.map((x) => <MasteryDot key={x.id} level={x.mastery} />)}</span>
                  </div>
                  <ul className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2 text-sm">
                    {topics.map((tp) => (
                      <li key={tp.id} className={cx("flex items-center gap-2", tp.isCurrent && "font-semibold")}>
                        <MasteryDot level={tp.mastery} />
                        <span className={cx(!tp.mastery && "text-mute")}>{tp.name}</span>
                        {tp.isCurrent && <span className="text-[10px] uppercase tracking-wide text-ink-500">now</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
