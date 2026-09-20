import { AppShell } from "@/components/shell";
import { getViewer } from "@/lib/auth";
import { getDb } from "@/db";
import { unreadNotifications } from "@/lib/queries";
import { t } from "@/lib/i18n";
import type { NavItem } from "@/components/nav-links";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const v = await getViewer("guardian");
  const unread = v.viewingAs ? 0 : (await unreadNotifications(getDb(), v.user.id)).length;
  const items: NavItem[] = [
    { href: "/parent", label: t("nav.home"), icon: "dashboard" },
    { href: "/parent/sessions", label: t("nav.sessions"), icon: "sessions" },
    { href: "/parent/homework", label: t("nav.homework"), icon: "homework" },
    { href: "/parent/tests", label: t("nav.tests"), icon: "tests" },
    { href: "/parent/progress", label: t("nav.progress"), icon: "progress" },
    { href: "/parent/feedback", label: t("nav.feedback"), icon: "feedback" },
    { href: "/parent/reports", label: t("nav.reports"), icon: "reports" },
    { href: "/parent/inbox", label: t("nav.inbox"), icon: "inbox" },
  ];
  return (
    <AppShell items={items} user={{ displayName: v.viewingAs?.label ?? v.user.displayName, hue: 160 }} role="guardian" viewingAs={v.viewingAs} unread={unread}>
      {children}
    </AppShell>
  );
}
