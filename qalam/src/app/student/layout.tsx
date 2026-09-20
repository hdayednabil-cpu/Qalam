import { AppShell } from "@/components/shell";
import { getViewer } from "@/lib/auth";
import { getDb } from "@/db";
import { unreadNotifications } from "@/lib/queries";
import { t } from "@/lib/i18n";
import type { NavItem } from "@/components/nav-links";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const v = await getViewer("student");
  const unread = v.viewingAs ? 0 : (await unreadNotifications(getDb(), v.user.id)).length;
  const items: NavItem[] = [
    { href: "/student", label: t("nav.home"), icon: "dashboard" },
    { href: "/student/homework", label: t("nav.homework"), icon: "homework" },
    { href: "/student/sessions", label: t("nav.sessions"), icon: "sessions" },
    { href: "/student/progress", label: t("nav.progress"), icon: "progress" },
    { href: "/student/tests", label: t("nav.tests"), icon: "tests" },
    { href: "/student/resources", label: t("nav.resources"), icon: "resources" },
    { href: "/student/inbox", label: t("nav.inbox"), icon: "inbox" },
  ];
  return (
    <AppShell items={items} user={{ displayName: v.viewingAs?.label ?? v.user.displayName, hue: 28 }} role="student" viewingAs={v.viewingAs} unread={unread}>
      {children}
    </AppShell>
  );
}
