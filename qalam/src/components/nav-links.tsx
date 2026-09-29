"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cx } from "./ui";
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Users, CalendarDays, BookOpenCheck, ClipboardList, Library, KeyRound, Search, Sparkles, BookMarked, MessageSquareText, FileText, Inbox, MoreHorizontal, X, ChevronRight } from "lucide-react";

const ICONS: Record<string, LucideIcon> = { dashboard: LayoutDashboard, students: Users, calendar: CalendarDays, homework: BookOpenCheck, tests: ClipboardList, resources: Library, invitations: KeyRound, search: Search, progress: Sparkles, curriculum: BookMarked, feedback: MessageSquareText, reports: FileText, sessions: CalendarDays, inbox: Inbox };
export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };
const matches = (path: string, href: string) => path === href || (href.split("/").length > 2 && path.startsWith(href + "/"));

export function WorkspaceHeading({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const current = items.find((it) => matches(path, it.href));
  return <div className="flex items-center gap-3 text-xs"><span className="text-mute">Workspace</span><ChevronRight size={13} className="text-slate-300" /><span className="font-medium">{current?.label ?? "Overview"}</span></div>;
}

export function NavLinks({ items, variant }: { items: NavItem[]; variant: "side" | "bottom" }) {
  const path = usePathname();
  const menu = useRef<HTMLDialogElement>(null);
  useEffect(() => { menu.current?.close(); }, [path]);
  const more = items.length > 5;
  if (variant === "bottom") {
    return <>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {items.slice(0, more ? 4 : 5).map((it) => {
          const Icon = ICONS[it.icon]; const active = matches(path, it.href);
          return <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} className={cx("relative flex min-w-0 flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium", active ? "text-ink-600" : "text-mute")}><Icon size={20} strokeWidth={active ? 2.4 : 1.8} /><span className="max-w-full truncate px-1">{it.label}</span>{!!it.badge && <span aria-label={`${it.badge} unread`} className="absolute top-2 right-[calc(50%-16px)] size-2 rounded-full bg-coral-500" />}</Link>;
        })}
        {more && <button type="button" aria-haspopup="dialog" onClick={() => menu.current?.showModal()} className={cx("relative flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium", items.slice(4).some((it) => matches(path, it.href)) ? "text-ink-600" : "text-mute")}><MoreHorizontal size={20} />More{items.slice(4).some((it) => !!it.badge) && <span className="absolute top-2 right-[calc(50%-16px)] size-2 rounded-full bg-coral-500" aria-label="Unread notifications" />}</button>}
      </nav>
      {more && <dialog ref={menu} aria-labelledby="navigation-title" className="mobile-menu rounded-2xl border border-line bg-white p-4 text-ink-900 shadow-lift" onClick={(event) => { if (event.target === event.currentTarget) menu.current?.close(); }}>
        <div className="mb-3 flex items-center justify-between pl-2"><h2 id="navigation-title" className="text-base font-bold">Your workspace</h2><button type="button" aria-label="Close navigation" onClick={() => menu.current?.close()} className="rounded-lg p-2 hover:bg-paper"><X size={20} /></button></div>
        <nav aria-label="All navigation" className="grid gap-1">{items.map((it) => { const Icon = ICONS[it.icon]; const active = matches(path, it.href); return <Link key={it.href} href={it.href} onClick={() => menu.current?.close()} aria-current={active ? "page" : undefined} className={cx("flex items-center gap-3 rounded-xl px-3 py-3 text-sm", active ? "bg-ink-50 font-semibold text-ink-700" : "hover:bg-paper")}><Icon size={18} /><span className="flex-1">{it.label}</span>{!!it.badge && <span className="rounded-md bg-coral-100 px-2 text-coral-700">{it.badge}</span>}</Link>; })}</nav>
      </dialog>}
    </>;
  }
  return <nav aria-label="Main navigation" className="flex flex-col gap-1">{items.map((it) => {
    const Icon = ICONS[it.icon]; const active = matches(path, it.href);
    return <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} className={cx("flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-medium transition-colors", active ? "bg-ink-600 text-white shadow-sm" : "text-slate-300 hover:bg-white/5 hover:text-white")}><Icon size={18} strokeWidth={1.8} /><span className="flex-1">{it.label}</span>{!!it.badge && <span className={cx("rounded-md px-1.5 text-[10px] font-semibold", active ? "bg-white/20 text-white" : "bg-white/10 text-slate-200")}>{it.badge}</span>}</Link>;
  })}</nav>;
}
