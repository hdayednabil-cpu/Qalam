"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Users, CalendarDays, BookOpenCheck, ClipboardList, Library, KeyRound, Search, Sparkles, BookMarked, MessageSquareText, FileText, Inbox } from "lucide-react";

const ICONS: Record<string, LucideIcon> = { dashboard: LayoutDashboard, students: Users, calendar: CalendarDays, homework: BookOpenCheck, tests: ClipboardList, resources: Library, invitations: KeyRound, search: Search, progress: Sparkles, curriculum: BookMarked, feedback: MessageSquareText, reports: FileText, sessions: CalendarDays, inbox: Inbox };

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };

export function NavLinks({ items, variant }: { items: NavItem[]; variant: "side" | "bottom" }) {
  const path = usePathname();
  const isActive = (href: string) => (href.split("/").length <= 2 ? path === href : path === href || path.startsWith(href + "/"));
  if (variant === "bottom") {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {items.slice(0, 5).map((it) => {
          const Icon = ICONS[it.icon];
          const active = isActive(it.href);
          return (
            <Link key={it.href} href={it.href} className={cx("relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-ink-800" : "text-mute")}>
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              {it.label}
              {!!it.badge && <span className="absolute top-1 right-[calc(50%-16px)] size-2 rounded-full bg-coral-500" />}
            </Link>
          );
        })}
      </nav>
    );
  }
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((it) => {
        const Icon = ICONS[it.icon];
        const active = isActive(it.href);
        return (
          <Link key={it.href} href={it.href} className={cx("flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors", active ? "bg-ink-800 text-white" : "text-ink-800/80 hover:bg-ink-50")}>
            <Icon size={18} strokeWidth={active ? 2.3 : 1.9} />
            <span className="flex-1">{it.label}</span>
            {!!it.badge && <span className={cx("rounded-full px-1.5 text-[11px] font-semibold", active ? "bg-white/20 text-white" : "bg-coral-100 text-coral-700")}>{it.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
