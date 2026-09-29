import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, LogOut, Settings2 } from "lucide-react";
import { NavLinks, WorkspaceHeading, type NavItem } from "./nav-links";
import { Avatar } from "./ui";
import { t } from "@/lib/i18n";
import { logout, clearViewAs } from "@/app/login/actions";
import type { Role } from "@/db/schema";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`display inline-flex items-center gap-2.5 text-[25px] font-bold tracking-[-0.06em] ${className}`}>
      <svg width="32" height="36" viewBox="0 0 32 36" fill="none" aria-hidden="true">
        <path d="M24 5H14C7.4 5 3 9.5 3 16s4.4 11 11 11h10V5Z" stroke="currentColor" strokeWidth="3.5" />
        <path d="m15 17 9 15M15 17h9" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      {t("app.name").toLowerCase()}<span className="text-ink-400">.</span>
    </span>
  );
}

export function AppShell({ children, items, user, viewingAs, role, unread = 0 }: { children: ReactNode; items: NavItem[]; user: { displayName: string; hue?: number }; viewingAs?: { label: string; role: "guardian" | "student" }; role: Role; unread?: number }) {
  const withBadge = items.map((it) => (it.icon === "inbox" ? { ...it, badge: unread } : it));
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[244px_minmax(0,1fr)]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3">Skip to content</a>
      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:flex-col bg-ink-950 px-4 py-7 text-white">
        <Link href={items[0].href} className="mb-10 px-4 w-fit"><Wordmark /></Link>
        <div className="mb-3 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{t(`roles.${viewingAs?.role ?? role}`)} workspace</div>
        <NavLinks items={withBadge} variant="side" />
        <div className="mt-auto pt-8">
          <Link href="/account" className="mb-5 flex items-center gap-3 rounded-xl px-4 py-3 text-xs text-slate-300 hover:bg-white/5 hover:text-white"><Settings2 size={16} /> Account settings <ArrowUpRight size={13} className="ml-auto" /></Link>
          <div className="flex items-center gap-3 border-t border-white/10 px-2 pt-5">
            <Avatar name={user.displayName} hue={user.hue ?? 220} size={36} />
            <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{user.displayName}</div><div className="mt-1 text-[11px] text-slate-400">{t(`roles.${role}`)}</div></div>
            <form action={logout}><button type="submit" aria-label={t("nav.signOut")} title={t("nav.signOut")} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><LogOut size={17} /></button></form>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex flex-col">
        <header className="flex min-h-[76px] items-center justify-between gap-3 border-b border-line bg-white px-5 md:px-8 xl:px-10">
          <Link href={items[0].href} className="md:hidden"><Wordmark /></Link>
          <div className="hidden md:block"><WorkspaceHeading items={items} /></div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-mute sm:block">A little progress, every day.</span>
            <Link href="/account" aria-label="Account settings"><Avatar name={user.displayName} hue={user.hue ?? 220} size={32} /></Link>
            <form action={logout} className="md:hidden"><button type="submit" aria-label={t("nav.signOut")} className="rounded-lg p-2 text-mute hover:bg-ink-50"><LogOut size={17} /></button></form>
          </div>
        </header>
        {viewingAs && (
          <div className="flex items-center justify-between gap-3 bg-saffron-100 px-5 py-3 text-sm text-saffron-700 md:px-8">
            <span>Viewing <strong>{viewingAs.label}</strong>’s {t(`roles.${viewingAs.role}`).toLowerCase()} workspace. Tutor permissions still apply.</span>
            <form action={clearViewAs}><button className="btn-secondary btn-sm" type="submit">Exit preview</button></form>
          </div>
        )}
        <main id="main-content" className="mx-auto w-full max-w-[1440px] flex-1 px-5 py-7 pb-28 md:px-8 md:py-9 xl:px-10">{children}</main>
        <NavLinks items={withBadge} variant="bottom" />
      </div>
    </div>
  );
}
