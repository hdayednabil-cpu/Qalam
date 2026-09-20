import Link from "next/link";
import { getDb } from "@/db";
import { requireUser } from "@/lib/auth";
import { listStudents } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { formatDayShort, formatTime } from "@/lib/dates";
import { Avatar, Badge, EmptyState, LinkButton, PageHeader, Progress, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const user = await requireUser("tutor");
  const students = await listStudents(getDb(), user);
  return (
    <div>
      <PageHeader title={t("tutor.allStudents")} subtitle={`${students.length} students · ${students.filter((s) => s.status === "active").length} active`} action={<LinkButton href="/tutor/students/new" variant="primary">+ {t("tutor.newStudent")}</LinkButton>} />
      {students.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {students.map((s) => (
            <Link key={s.id} href={`/tutor/students/${s.id}`} className="card p-4 hover:border-ink-300 transition-colors">
              <div className="flex items-start gap-3">
                <Avatar name={s.fullName} hue={s.hue} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-base">{s.fullName}</span>
                    {s.status !== "active" && <StatusBadge status={s.status} />}
                    {s.alerts.filter((a) => a.severity !== "info").length > 0 && <Badge tone="warn">{s.alerts.filter((a) => a.severity !== "info").length} alerts</Badge>}
                  </div>
                  <div className="text-sm text-mute">
                    {s.gradeYear}
                    {s.school ? ` · ${s.school}` : ""} · {s.familyName}
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="text-mute">{t("student.currentTopic")}: </span>
                    {s.currentTopic ?? "—"}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-mute">
                    <Progress value={s.coverage} label={t("tutor.coverage")} />
                    <div>
                      {s.pkg ? (
                        <>
                          <div className="flex justify-between mb-1">
                            <span>{t("common.package")}</span>
                            <span className={s.pkg.low ? "text-coral-600 font-semibold" : ""}>
                              {s.pkg.remaining}/{s.pkg.total} left
                            </span>
                          </div>
                          <Progress value={Math.round((s.pkg.used / s.pkg.total) * 100)} tone={s.pkg.low ? "danger" : "neutral"} />
                        </>
                      ) : (
                        <span>No package</span>
                      )}
                    </div>
                  </div>
                  {s.nextSession && (
                    <div className="mt-2 text-xs text-mute">
                      Next: {formatDayShort(s.nextSession.startsAt)} {formatTime(s.nextSession.startsAt)}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState>{t("empty.noStudents")}</EmptyState>
      )}
    </div>
  );
}
