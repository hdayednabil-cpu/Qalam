import { getDb } from "@/db";
import { requireUser } from "@/lib/auth";
import { listAccounts, listInvitations, listStudents } from "@/lib/queries";
import { t } from "@/lib/i18n";
import { formatDate, formatDateTime } from "@/lib/dates";
import { Badge, Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { ShareActions } from "@/components/share-actions";
import { accountAction, invitationAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function InvitationsPage() {
  const user = await requireUser("tutor");
  const db = getDb();
  const invitations = await listInvitations(db, user);
  const accounts = (await listAccounts(db, user)).filter((a) => a.role !== "tutor");
  const students = await listStudents(db, user);
  const state = (i: (typeof invitations)[number]) => (i.usedAt ? "used" : i.revokedAt ? "revoked" : i.expiresAt.getTime() < Date.now() ? "expired" : "pending");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return (
    <div className="space-y-6">
      <PageHeader title={t("tutor.invitationsTitle")} subtitle="Generate a code per person from a student's page. Guardians activate first; students follow." />
      <Card title={t("nav.invitations")}>
        {invitations.length ? (
          <div className="divide-y divide-line/70">
            {invitations.map((i) => {
              const st = state(i);
              const who = i.role === "guardian" ? i.guardian?.fullName : `${i.student?.firstName ?? ""} ${i.student?.lastName ?? ""}`;
              return (
                <div key={i.id} className="py-3 flex flex-wrap items-center gap-3">
                  <span className="font-mono font-semibold tracking-wider">{i.code}</span>
                  <span className="text-sm">{who}</span>
                  <Badge tone="brand">{t(`roles.${i.role}`)}</Badge>
                  <Badge tone={st === "pending" ? "warn" : st === "used" ? "success" : "neutral"}>{st}</Badge>
                  <span className="text-xs text-mute">{st === "used" && i.usedAt ? `${t("tutor.usedOn")} ${formatDate(i.usedAt)}` : `${t("tutor.expires")} ${formatDate(i.expiresAt)}`}</span>
                  <span className="ml-auto flex items-center gap-2">
                    {st === "pending" && <ShareActions text={`Hi! Your ${t("app.name")} code is ${i.code}. Activate at ${appUrl}/activate?code=${i.code}`} phone={i.guardian?.phone} labels={{ copy: t("common.copy"), copied: t("common.copied"), whatsapp: t("common.whatsapp") }} />}
                    {st === "pending" && (
                      <form action={invitationAction}><input type="hidden" name="revoke" value={i.id} /><button className="btn-ghost btn-sm" type="submit">{t("tutor.revoke")}</button></form>
                    )}
                    {(st === "expired" || st === "revoked") && (
                      <form action={invitationAction}>
                        {i.studentId ? <input type="hidden" name="studentId" value={i.studentId} /> : <input type="hidden" name="guardianId" value={i.guardianId ?? ""} />}
                        <button className="btn-secondary btn-sm" type="submit">{t("tutor.regenerate")}</button>
                      </form>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState>{t("empty.noInvites")}</EmptyState>
        )}
      </Card>
      <Card title={t("tutor.activeAccounts")} subtitle="Deactivating signs the person out everywhere immediately.">
        <div className="divide-y divide-line/70">
          {accounts.map((a) => {
            const st = students.find((s) => s.name === a.displayName || s.fullName.startsWith(a.displayName));
            return (
              <div key={a.id} className="py-3 flex flex-wrap items-center gap-3">
                <span className="font-medium">{a.displayName}</span>
                <span className="text-sm text-mute">{a.email ?? a.username}</span>
                <Badge tone="brand">{t(`roles.${a.role}`)}</Badge>
                <StatusBadge status={a.status === "deactivated" ? "ended" : "active"} />
                {st && <span className="text-xs text-mute">{st.familyName}</span>}
                <span className="text-xs text-mute">last login {a.lastLoginAt ? formatDateTime(a.lastLoginAt) : "never"}</span>
                <span className="ml-auto flex items-center gap-2">
                  <form action={accountAction} className="flex items-center gap-1">
                    <input type="hidden" name="userId" value={a.id} />
                    <input type="hidden" name="op" value="reset" />
                    <input name="password" className="input py-1 text-xs w-36" placeholder="new password" minLength={8} required />
                    <button className="btn-ghost btn-sm" type="submit">{t("tutor.resetPassword")}</button>
                  </form>
                  <form action={accountAction}>
                    <input type="hidden" name="userId" value={a.id} />
                    <input type="hidden" name="op" value={a.status === "active" ? "deactivate" : "reactivate"} />
                    <button className={a.status === "active" ? "btn-danger btn-sm" : "btn-secondary btn-sm"} type="submit">{a.status === "active" ? t("tutor.deactivate") : t("tutor.reactivate")}</button>
                  </form>
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
