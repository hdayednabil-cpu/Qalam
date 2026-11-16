import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/db";
import { unreadNotifications } from "@/lib/queries";
import { t } from "@/lib/i18n";
import type { NavItem } from "@/components/nav-links";

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("tutor");
  if (user.role !== "tutor") redirect("/");
  const unread = (await unreadNotifications(getDb(), user.id)).length;
  const items: NavItem[] = [
    { href: "/tutor", label: t("nav.dashboard"), icon: "dashboard", mobile: true },
    { href: "/tutor/students", label: t("nav.students"), icon: "students", mobile: true },
    { href: "/tutor/calendar", label: t("nav.calendar"), icon: "calendar", mobile: true },
    { href: "/tutor/search", label: t("nav.search"), icon: "search" },
    { href: "/tutor/inbox", label: t("nav.inbox"), icon: "inbox", mobile: true },
    { href: "/tutor/curriculum", label: t("nav.curriculum"), icon: "curriculum" },
    { href: "/tutor/invitations", label: t("nav.invitations"), icon: "invitations" },
  ];
  return (
    <AppShell items={items} user={{ displayName: user.displayName, hue: 190 }} role="tutor" unread={unread}>
      {children}
    </AppShell>
  );
}
