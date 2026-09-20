import Link from "next/link";
import type { ReactNode } from "react";
import { NavLinks, type NavItem } from "./nav-links";
import { Avatar } from "./ui";
import { OrreryMark } from "./orrery";
import { t } from "@/lib/i18n";
import { logout, clearViewAs } from "@/app/login/actions";
import type { Role } from "@/db/schema";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`display inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-ink-900 ${className}`}>
      <OrreryMark size={24} />
      {t("app.name").toLowerCase()}
    </span>
  );
}

export function AppShell({ children, items, user, viewingAs, role, unread = 0 }: { children: ReactNode; items: NavItem[]; user: { displayName: string; hue?: number }; viewingAs?: { label: string; role: "guardian" | "student" }; role: Role; unread?: number }) {
  const withBadge = items.map((it) => (it.icon === "inbox" ? { ...it, badge: unread } : it));
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden md:flex md:flex-col md:sticky md:top-0 md:h-dvh border-r border-line/80 bg-paper px-4 py-5">
        <Link href={items[0].href} className="px-2 mb-6">
          <Wordmark />
        </Link>
        <NavLinks items={withBadge} variant="side" />
        <div className="mt-auto pt-4 border-t border-line/80">
          <div className="flex items-center gap-3 px-2">
            <Avatar name={user.displayName} hue={user.hue ?? 200} size={34} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{user.displayName}</div>
              <div className="text-xs text-mute">{t(`roles.${role}`)}</div>
            </div>
            <form action={logout}>
              <button className="btn-ghost btn-sm" type="submit">
                {t("nav.signOut")}
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line/80 bg-paper/90 px-4 py-3 backdrop-blur md:hidden">
          <Link href={items[0].href}>
            <Wordmark />
          </Link>
          <div className="flex items-center gap-2">
            <Avatar name={user.displayName} hue={user.hue ?? 200} size={30} />
            <form action={logout}>
              <button className="btn-ghost btn-sm" type="submit">
                {t("nav.signOut")}
              </button>
            </form>
          </div>
        </header>
        {viewingAs && (
          <div className="flex items-center justify-between gap-3 bg-saffron-200 px-4 py-2 text-sm text-ink-900">
            <span>
              Viewing as <strong>{t(`roles.${viewingAs.role}`)}</strong> — {viewingAs.label}. Permissions are the tutor's; the layout is theirs.
            </span>
            <form action={clearViewAs}>
              <button className="btn-secondary btn-sm bg-white" type="submit">
                Exit
              </button>
            </form>
          </div>
        )}
        <main className="flex-1 px-4 py-5 md:px-8 md:py-8 pb-24 md:pb-8 max-w-6xl w-full">{children}</main>
        <NavLinks items={withBadge} variant="bottom" />
      </div>
    </div>
  );
}
