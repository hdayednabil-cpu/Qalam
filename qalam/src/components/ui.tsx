import Link from "next/link";
import type { ReactNode } from "react";
import type { Mastery } from "@/db/schema";
import { MASTERY_TONE } from "@/lib/domain";
import { masteryLabel, statusLabel } from "@/lib/i18n";

export type Tone = "neutral" | "danger" | "warn" | "info" | "success" | "brand";
const toneClass: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  danger: "bg-coral-100 text-coral-700",
  warn: "bg-saffron-100 text-saffron-700",
  info: "bg-sky-100 text-sky-700",
  success: "bg-moss-100 text-moss-700",
  brand: "bg-ink-50 text-ink-700",
};
const toneBar: Record<Tone, string> = { neutral: "bg-stone-300", danger: "bg-coral-500", warn: "bg-saffron-400", info: "bg-sky-500", success: "bg-moss-500", brand: "bg-ink-500" };

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ children, className, title, action, subtitle, padded = true }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; subtitle?: ReactNode; padded?: boolean }) {
  return (
    <section className={cx("card", padded && "p-5 sm:p-6", className)}>
      {(title || action) && (
        <header className={cx("flex items-start justify-between gap-3", padded ? "mb-5" : "px-5 pt-5 mb-3")}>
          <div>
            {title && <h2 className="text-[15px] font-bold text-ink-900">{title}</h2>}
            {subtitle && <p className="text-sm text-mute mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", toneClass[tone], className)}>{children}</span>;
}

export const statusTone: Record<string, Tone> = {
  scheduled: "brand", completed: "success", cancelled_by_family: "warn", cancelled_by_tutor: "neutral", no_show: "danger", rescheduled: "neutral",
  assigned: "brand", in_progress: "info", submitted: "warn", resubmitted: "warn", reviewed: "success", corrections_requested: "danger", completed_hw: "success", overdue: "danger",
  revised: "success", needs_work: "danger", not_started: "neutral", open: "brand", done: "success", pending: "warn", approved: "success",
  active: "success", paused: "warn", ended: "neutral", prospective: "info", draft: "neutral", published: "success",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone[status] ?? "neutral"}>{statusLabel(status)}</Badge>;
}

export function MasteryBadge({ level }: { level: Mastery | null }) {
  const l = level ?? "not_started";
  return <Badge tone={MASTERY_TONE[l]}>{masteryLabel(l)}</Badge>;
}

export function MasteryDot({ level }: { level: Mastery | null }) {
  const l = level ?? "not_started";
  return <span className={cx("inline-block size-2.5 rounded-full", toneBar[MASTERY_TONE[l]])} title={masteryLabel(l)} />;
}

export function Progress({ value, tone = "brand", className, label }: { value: number; tone?: Tone; className?: string; label?: string }) {
  return (
    <div className={cx("w-full", className)}>
      {label && (
        <div className="flex justify-between text-xs text-mute mb-1">
          <span>{label}</span>
          <span className="tabular-nums">{value}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={cx("h-full rounded-full transition-all", toneBar[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 7, tone = "brand", children }: { value: number; size?: number; stroke?: number; tone?: Tone; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const colour = { neutral: "#94a3b8", danger: "var(--color-coral-500)", warn: "var(--color-saffron-400)", info: "var(--color-sky-500)", success: "var(--color-moss-500)", brand: "var(--color-ink-500)" }[tone];
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-line)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={colour} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * Math.max(0, Math.min(100, value))) / 100} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">{children ?? `${value}%`}</div>
    </div>
  );
}

export function Avatar({ name, hue = 210, size = 40, className }: { name: string; hue?: number; size?: number; className?: string }) {
  const initials = name
    .split(" ")
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className={cx("inline-flex shrink-0 items-center justify-center rounded-xl font-semibold", className)} style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue} 40% 93%)`, color: `hsl(${hue} 35% 32%)` }}>
      {initials}
    </div>
  );
}

export function EmptyState({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-paper/80 px-5 py-9 text-center text-sm leading-relaxed text-mute">
      {icon}
      <p className="max-w-xs">{children}</p>
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone }) {
  return (
    <div className="card h-full p-5 sm:p-6">
      <div className="text-xs font-medium text-mute">{label}</div>
      <div className={cx("mt-3 text-3xl font-semibold display tracking-tight tabular-nums", tone === "danger" && "text-coral-600", tone === "warn" && "text-saffron-600", tone === "success" && "text-moss-600")}>{value}</div>
      {hint && <div className="text-xs leading-relaxed text-mute mt-2">{hint}</div>}
    </div>
  );
}

export function Field({ label, children, hint, className }: { label: ReactNode; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="label mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, subtitle, action, eyebrow }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="label mb-1">{eyebrow}</div>}
        <h1 className="text-[28px] md:text-[34px] font-bold leading-tight text-ink-900">{title}</h1>
        {subtitle && <p className="mt-2 text-sm leading-relaxed text-mute max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function LinkButton({ href, children, variant = "secondary", className }: { href: string; children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "accent"; className?: string }) {
  return (
    <Link href={href} className={cx(`btn-${variant}`, className)}>
      {children}
    </Link>
  );
}

export function KeyValue({ items }: { items: { k: ReactNode; v: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {items.map((it, i) => (
        <div key={i} className="contents">
          <dt className="text-mute">{it.k}</dt>
          <dd className="text-ink-900">{it.v}</dd>
        </div>
      ))}
    </dl>
  );
}
