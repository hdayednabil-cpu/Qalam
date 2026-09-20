import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as sch from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getWorkspace, listInvitations } from "@/lib/queries";
import { strengths, weaknesses } from "@/lib/domain";
import { t, masteryLabel, visibilityLabel } from "@/lib/i18n";
import { formatDate, formatDayShort, formatTime, WEEKDAYS_SHORT, minutesLabel } from "@/lib/dates";
import { Avatar, Badge, Card, EmptyState, Field, KeyValue, LinkButton, MasteryDot, Progress, Ring, StatusBadge, cx } from "@/components/ui";
import { AlertList, HomeworkRow, SessionRow, StatusLegend, TestRow, TopicChips } from "@/components/items";
import { ShareActions } from "@/components/share-actions";
import { setViewAs } from "@/app/login/actions";
import { currentTopicAction, enrolAction, feedbackAction, invitationAction, masteryAction, nextStepAction, topicScopeAction, updateStudentAction } from "../../actions";

export const dynamic = "force-dynamic";

const shareLabels = () => ({ copy: t("common.copy"), copied: t("common.copied"), whatsapp: t("common.whatsapp") });

export default async function StudentWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("tutor");
  const db = getDb();
  let ws;
  try {
    ws = await getWorkspace(db, user, id);
  } catch {
    notFound();
  }
  const invitations = (await listInvitations(db, user)).filter((i) => i.studentId === id || (i.guardianId && ws.guardians.some((g) => g.id === i.guardianId)));
  const templates = await db.query.curriculumTemplates.findMany({ where: eq(sch.curriculumTemplates.tutorId, user.tutorId) });
  const studentUser = ws.student.userId ? await db.query.users.findFirst({ where: eq(sch.users.id, ws.student.userId) }) : null;
  const guardianUsers = await Promise.all(ws.guardians.map(async (g) => (g.userId ? await db.query.users.findFirst({ where: eq(sch.users.id, g.userId) }) : null)));
  const primaryPhone = ws.guardians.find((g) => g.phone)?.phone ?? null;
  const nav = ["overview", "curriculum", "sessions", "homework", "tests", "feedback", "accounts"];
  const topStrengths = strengths(ws.allTopics);
  const topWeak = weaknesses(ws.allTopics);
  const upcomingTests = ws.assessments.filter((a) => a.daysUntil >= 0 && !a.result);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <Avatar name={`${ws.student.firstName} ${ws.student.lastName}`} hue={ws.student.avatarHue} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-semibold">
              {ws.student.firstName} {ws.student.lastName}
            </h1>
            <StatusBadge status={ws.student.status} />
          </div>
          <p className="text-sm text-mute">
            {ws.student.gradeYear} · {ws.student.school} · {ws.family.name} · since {ws.student.startDate ? formatDate(ws.student.startDate) : "—"}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {ws.guardians.map((g) => (
              <span key={g.id} className="text-ink-800">
                {g.fullName}
                {g.relationship ? ` (${g.relationship})` : ""}
                {g.phone && (
                  <a className="ml-1 text-ink-500 hover:underline" href={`https://wa.me/${g.phone.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer">
                    {g.phone}
                  </a>
                )}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {ws.nextSession && (
            <LinkButton href={`/tutor/sessions/${ws.nextSession.id}`} variant="primary">
              {t("tutor.logSession")}
            </LinkButton>
          )}
          <LinkButton href={`/tutor/homework/new?student=${id}`}>{t("tutor.assignHomework")}</LinkButton>
          <LinkButton href={`/tutor/tests/new?student=${id}`}>{t("tutor.createTest")}</LinkButton>
          <form action={setViewAs}>
            <input type="hidden" name="role" value="student" />
            <input type="hidden" name="id" value={id} />
            <button className="btn-ghost" type="submit">{t("tutor.viewAsStudent")}</button>
          </form>
          <form action={setViewAs}>
            <input type="hidden" name="role" value="parent" />
            <input type="hidden" name="id" value={ws.family.id} />
            <button className="btn-ghost" type="submit">{t("tutor.viewAsParent")}</button>
          </form>
          <a className="btn-ghost" href={`/tutor/students/${id}/export`}>{t("common.exportJson")}</a>
        </div>
      </div>

      <nav className="sticky top-0 md:top-0 z-10 -mx-4 md:mx-0 overflow-x-auto bg-paper/95 backdrop-blur px-4 md:px-0 py-2 flex gap-1 text-sm border-b border-line/70">
        {nav.map((n) => (
          <a key={n} href={`#${n}`} className="rounded-lg px-3 py-1 font-medium text-ink-700 hover:bg-ink-50 capitalize whitespace-nowrap">
            {n}
          </a>
        ))}
      </nav>

      <AlertList alerts={ws.alerts} />

      {/* ---------------- Overview ---------------- */}
      <section id="overview" className="grid gap-4 md:grid-cols-3">
        <Card title={t("tutor.academicOverview")} className="md:col-span-2">
          <div className="grid gap-5 sm:grid-cols-2">
            {ws.enrolments.map((e) => (
              <div key={e.id} className="flex items-center gap-4">
                <Ring value={e.coverage.percent} tone={e.coverage.percent >= 60 ? "success" : e.coverage.percent >= 30 ? "brand" : "warn"} />
                <div className="min-w-0">
                  <div className="font-semibold leading-tight">{e.subject}</div>
                  <div className="text-xs text-mute line-clamp-2">{e.templateName}</div>
                  <div className="mt-1 text-xs text-mute">
                    {e.coverage.completed} done · {e.coverage.current} current · {e.coverage.needsRevision} to revise · {e.coverage.notCovered} not covered
                  </div>
                  {e.currentTopic && (
                    <div className="mt-1 text-sm">
                      <span className="text-mute">{t("student.currentTopic")}: </span>
                      <span className="font-medium">{e.currentTopic.name}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!ws.enrolments.length && <EmptyState>No curriculum yet — enrol the student below.</EmptyState>}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="label mb-1.5">{t("tutor.strengths")}</div>
              <TopicChips topics={topStrengths} empty="No strong topics recorded yet" />
            </div>
            <div>
              <div className="label mb-1.5">{t("tutor.weaknesses")}</div>
              <TopicChips topics={topWeak} empty="Nothing flagged" />
            </div>
          </div>
        </Card>
        <div className="space-y-4">
          <Card title={t("common.package")}>
            {ws.pkg ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className={cx("text-3xl font-semibold display", ws.pkg.low && "text-coral-600")}>{ws.pkg.remaining}</span>
                  <span className="text-sm text-mute">of {ws.pkg.total} remaining</span>
                </div>
                <Progress value={Math.round((ws.pkg.used / ws.pkg.total) * 100)} tone={ws.pkg.low ? "danger" : "brand"} className="mt-2" />
                <div className="mt-2 text-xs text-mute">
                  {ws.pkg.used} used · {ws.pkg.scheduled} scheduled{ws.pkg.shared ? " · shared by the family" : ""} · {ws.pkg.paymentStatus}
                </div>
              </>
            ) : (
              <EmptyState>No active package</EmptyState>
            )}
          </Card>
          <Card title={t("student.nextSession")}>
            {ws.nextSession ? <SessionRow s={ws.nextSession} showStudents={false} href={`/tutor/sessions/${ws.nextSession.id}`} compact /> : <EmptyState>{t("empty.noSessions")}</EmptyState>}
            <div className="mt-2 text-xs text-mute">
              Weekly: {ws.schedules.map((sc) => `${WEEKDAYS_SHORT[sc.weekday]} ${sc.startTime} (${minutesLabel(sc.durationMinutes)})`).join(", ") || "no fixed slot"}
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card title={t("tutor.nextSteps")} subtitle="Your second brain for this student.">
          {ws.nextSteps.length ? (
            <ul className="space-y-2">
              {ws.nextSteps.map((n) => (
                <li key={n.id} className="flex items-start gap-2 text-sm">
                  <form action={nextStepAction}>
                    <input type="hidden" name="done" value={n.id} />
                    <button className="mt-0.5 size-4 rounded-full border-2 border-ink-300 hover:bg-moss-100" type="submit" title={t("common.markDone")} />
                  </form>
                  <span>
                    {n.text} <span className="text-xs text-mute">· {n.source}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>{t("empty.noSteps")}</EmptyState>
          )}
          <form action={nextStepAction} className="mt-3 flex gap-2">
            <input type="hidden" name="studentId" value={id} />
            <input name="text" className="input" placeholder={t("tutor.addNextStep")} required />
            <button className="btn-secondary" type="submit">{t("common.add")}</button>
          </form>
        </Card>
        <Card title={t("tutor.privateNote")} subtitle="Academic notes are tutor-only. The important note is shown on the student's dashboard.">
          <form action={updateStudentAction} className="space-y-3">
            <input type="hidden" name="studentId" value={id} />
            <Field label="Academic notes (private)">
              <textarea name="academicNotes" className="input min-h-24" defaultValue={ws.student.academicNotes ?? ""} />
            </Field>
            <Field label="Important note (shown to the student)">
              <input name="importantNote" className="input" defaultValue={ws.student.importantNote ?? ""} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <select name="status" className="input" defaultValue={ws.student.status}>
                  {["active", "paused", "ended", "prospective"].map((st) => (
                    <option key={st} value={st}>{t(`status.${st}`)}</option>
                  ))}
                </select>
              </Field>
              <div className="flex items-end">
                <button className="btn-secondary w-full" type="submit">{t("common.save")}</button>
              </div>
            </div>
          </form>
        </Card>
      </section>

      {/* ---------------- Curriculum ---------------- */}
      <section id="curriculum" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">{t("tutor.coverage")}</h2>
          <StatusLegend />
        </div>
        {ws.enrolments.map((e) => {
          const sections = new Map<string, typeof e.topics>();
          for (const tp of e.topics) {
            const k = tp.sectionName ?? "Topics";
            if (!sections.has(k)) sections.set(k, []);
            sections.get(k)!.push(tp);
          }
          return (
            <Card key={e.id} title={e.templateName} subtitle={`${e.coverage.percent}% covered · ${e.coverage.total} topics in scope`}>
              <div className="space-y-4">
                {[...sections.entries()].map(([name, topics]) => (
                  <details key={name} open={topics.some((x) => x.isCurrent || x.mastery)} className="group">
                    <summary className="cursor-pointer list-none flex items-center gap-2 py-1 font-medium">
                      <span className="text-mute group-open:rotate-90 transition-transform">▸</span>
                      {name}
                      <span className="text-xs text-mute font-normal">
                        {topics.filter((x) => x.mastery && x.mastery !== "not_started").length}/{topics.length}
                      </span>
                      <span className="ml-auto flex gap-0.5">
                        {topics.map((x) => (
                          <MasteryDot key={x.id} level={x.mastery} />
                        ))}
                      </span>
                    </summary>
                    <div className="mt-1 divide-y divide-line/60">
                      {topics.map((tp) => (
                        <div key={tp.id} className={cx("flex flex-wrap items-center gap-2 py-1.5 text-sm", !tp.inScope && "opacity-50")}>
                          <MasteryDot level={tp.mastery} />
                          <span className="text-xs text-mute w-10">{tp.code}</span>
                          <span className={cx("flex-1 min-w-40", tp.isCurrent && "font-semibold")}>
                            {tp.name}
                            {tp.isCurrent && <Badge tone="brand" className="ml-2">current</Badge>}
                          </span>
                          <form action={masteryAction} className="flex items-center gap-1">
                            <input type="hidden" name="studentId" value={id} />
                            <input type="hidden" name="topicId" value={tp.id} />
                            <select name="level" className="input py-1 text-xs w-36" defaultValue={tp.mastery ?? ""}>
                              <option value="" disabled>{t("tutor.overrideMastery")}</option>
                              {sch.MASTERY.map((l) => (
                                <option key={l} value={l}>{masteryLabel(l)}</option>
                              ))}
                            </select>
                            <button className="btn-secondary btn-sm" type="submit">{t("common.save")}</button>
                          </form>
                          {!tp.isCurrent && (
                            <form action={currentTopicAction}>
                              <input type="hidden" name="studentId" value={id} />
                              <input type="hidden" name="topicId" value={tp.id} />
                              <button className="btn-ghost btn-sm" type="submit">Set current</button>
                            </form>
                          )}
                          <form action={topicScopeAction}>
                            <input type="hidden" name="studentId" value={id} />
                            <input type="hidden" name="topicId" value={tp.id} />
                            <input type="hidden" name="inScope" value={tp.inScope ? "false" : "true"} />
                            <button className="btn-ghost btn-sm" type="submit">{tp.inScope ? "Exclude" : "Include"}</button>
                          </form>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </Card>
          );
        })}
        <form action={enrolAction} className="flex flex-wrap gap-2 items-end">
          <input type="hidden" name="studentId" value={id} />
          <Field label="Enrol in another curriculum">
            <select name="templateId" className="input min-w-72" required>
              {templates.map((tp) => (
                <option key={tp.id} value={tp.id}>{tp.name}</option>
              ))}
            </select>
          </Field>
          <button className="btn-secondary" type="submit">Enrol</button>
        </form>
      </section>

      {/* ---------------- Sessions ---------------- */}
      <section id="sessions">
        <Card title={t("tutor.sessionHistory")} subtitle={`${ws.stats.sessionsThisMonth} completed this month · attendance ${ws.stats.attendance ?? "—"}%`} action={<LinkButton href="/tutor/calendar" variant="ghost">{t("nav.calendar")} →</LinkButton>}>
          <div className="divide-y divide-line/70">
            {ws.upcoming.slice(0, 2).map((s) => (
              <SessionRow key={s.id} s={s} showStudents={false} href={`/tutor/sessions/${s.id}`} />
            ))}
            {ws.sessions
              .filter((s) => s.status !== "scheduled" || s.needsLog)
              .slice(0, 10)
              .map((s) => (
                <SessionRow key={s.id} s={s} showStudents={false} href={`/tutor/sessions/${s.id}`} />
              ))}
          </div>
        </Card>
      </section>

      {/* ---------------- Homework ---------------- */}
      <section id="homework">
        <Card title={t("nav.homework")} subtitle={`Completion ${ws.stats.homeworkCompletion ?? "—"}% of due homework`} action={<LinkButton href={`/tutor/homework/new?student=${id}`} variant="secondary">{t("tutor.assignHomework")}</LinkButton>}>
          {ws.homework.length ? (
            <div className="divide-y divide-line/70">
              {ws.homework.map((h) => (
                <HomeworkRow key={h.id} h={h} href={`/tutor/homework/${h.id}`} />
              ))}
            </div>
          ) : (
            <EmptyState>{t("empty.noHomework")}</EmptyState>
          )}
        </Card>
      </section>

      {/* ---------------- Tests ---------------- */}
      <section id="tests">
        <Card title={t("nav.revision")} action={<LinkButton href={`/tutor/tests/new?student=${id}`} variant="secondary">{t("tutor.createTest")}</LinkButton>}>
          {ws.assessments.length ? (
            <div className="divide-y divide-line/70">
              {ws.assessments.map((a) => (
                <TestRow key={a.id} a={a} href={`/tutor/tests/${a.id}`} />
              ))}
            </div>
          ) : (
            <EmptyState>{t("empty.noTests")}</EmptyState>
          )}
          {upcomingTests.length > 0 && <p className="mt-2 text-xs text-mute">{t("parent.readinessNote")}</p>}
        </Card>
      </section>

      {/* ---------------- Feedback ---------------- */}
      <section id="feedback">
        <Card title={t("nav.feedback")} subtitle="Every note has an explicit audience. Private stays with you.">
          <form action={feedbackAction} className="mb-4 space-y-2">
            <input type="hidden" name="studentId" value={id} />
            <textarea name="body" className="input min-h-20" placeholder="Write a note for the family, the student, or yourself…" required />
            <div className="flex flex-wrap items-center gap-3">
              <select name="visibility" className="input w-auto" defaultValue="family">
                {sch.VISIBILITY.map((v) => (
                  <option key={v} value={v}>{visibilityLabel(v)}</option>
                ))}
              </select>
              <label className="text-sm flex items-center gap-1.5"><input type="checkbox" name="important" /> Important</label>
              <button className="btn-primary" type="submit">{t("common.save")}</button>
            </div>
          </form>
          {ws.feedback.length ? (
            <ul className="divide-y divide-line/70">
              {ws.feedback.map((f) => (
                <li key={f.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-mute mb-1">
                    <Badge tone={f.visibility === "private" ? "neutral" : f.visibility === "family" ? "success" : "info"}>{visibilityLabel(f.visibility)}</Badge>
                    {f.important && <Badge tone="warn">important</Badge>}
                    <span>{formatDayShort(f.createdAt)} · {f.targetType}</span>
                  </div>
                  <p className="text-sm">{f.body}</p>
                  {f.visibility !== "private" && (
                    <div className="mt-2">
                      <ShareActions text={f.body} phone={primaryPhone} labels={shareLabels()} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>{t("empty.noFeedback")}</EmptyState>
          )}
        </Card>
      </section>

      {/* ---------------- Accounts ---------------- */}
      <section id="accounts" className="grid gap-4 md:grid-cols-2">
        <Card title={t("tutor.activeAccounts")}>
          <KeyValue
            items={[
              { k: "Student login", v: studentUser ? `${studentUser.username ?? studentUser.email} · ${t(`status.${studentUser.status}`)}` : <span className="text-mute">Not activated</span> },
              ...ws.guardians.map((g, i) => ({ k: g.fullName, v: guardianUsers[i] ? `${guardianUsers[i]!.email} · ${t(`status.${guardianUsers[i]!.status}`)}` : <span className="text-mute">Not activated</span> })),
              { k: "Family access", v: `${t(`status.${ws.family.accessStatus}`)}${ws.family.validUntil ? ` until ${formatDate(ws.family.validUntil)}` : ""}` },
            ]}
          />
          <p className="mt-3 text-xs text-mute">Deactivate accounts or reset passwords under {t("nav.invitations")}.</p>
        </Card>
        <Card title={t("nav.invitations")} subtitle="Guardian first, then the student. Codes expire after 14 days.">
          <div className="space-y-3">
            {invitations
              .filter((i) => !i.usedAt && !i.revokedAt && i.expiresAt.getTime() > Date.now())
              .map((i) => {
                const msg = `Hi! Your ${t("app.name")} code is ${i.code}. Activate your account at ${process.env.APP_URL ?? "http://localhost:3000"}/activate?code=${i.code} (expires ${formatDate(i.expiresAt)}).`;
                return (
                  <div key={i.id} className="rounded-xl border border-line p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-semibold tracking-wider">{i.code}</span>
                        <span className="ml-2 text-xs text-mute">
                          {t(`roles.${i.role}`)} · {i.role === "guardian" ? i.guardian?.fullName : ws.displayName} · expires {formatDate(i.expiresAt)}
                        </span>
                      </div>
                      <form action={invitationAction}>
                        <input type="hidden" name="revoke" value={i.id} />
                        <button className="btn-ghost btn-sm" type="submit">{t("tutor.revoke")}</button>
                      </form>
                    </div>
                    <div className="mt-2">
                      <ShareActions text={msg} phone={i.role === "guardian" ? i.guardian?.phone : primaryPhone} labels={shareLabels()} />
                    </div>
                  </div>
                );
              })}
            <div className="flex flex-wrap gap-2">
              {!studentUser && (
                <form action={invitationAction}>
                  <input type="hidden" name="studentId" value={id} />
                  <button className="btn-secondary btn-sm" type="submit">{t("tutor.generateInvite")}: student</button>
                </form>
              )}
              {ws.guardians.map((g, i) =>
                guardianUsers[i] ? null : (
                  <form key={g.id} action={invitationAction}>
                    <input type="hidden" name="guardianId" value={g.id} />
                    <button className="btn-secondary btn-sm" type="submit">{t("tutor.generateInvite")}: {g.fullName.split(" ")[0]}</button>
                  </form>
                ),
              )}
            </div>
          </div>
        </Card>
      </section>

      <div className="text-xs text-mute flex flex-wrap gap-3">
        <Link href="/tutor/students" className="hover:underline">← {t("tutor.allStudents")}</Link>
        <span>Last logged: {ws.lastLogged ? `${formatDayShort(ws.lastLogged.startsAt)} ${formatTime(ws.lastLogged.startsAt)}` : "—"}</span>
        <span>{ws.stats.upcomingThisMonth} upcoming this month</span>
      </div>
    </div>
  );
}
