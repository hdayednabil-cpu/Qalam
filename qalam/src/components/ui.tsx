import Link from "next/link";
import type { ReactNode } from "react";
import type { Mastery } from "@/db/schema";
import { MASTERY_TONE } from "@/lib/domain";
import { masteryLabel, statusLabel } from "@/lib/i18n";

export type Tone = "neutral" | "danger" | "warn" | "info" | "success" | "brand";
const toneClass: Record<Tone, string> = {
  neutral: "bg-stone-100 text-stone-700",
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
    <section className={cx("card", padded && "p-5", className)}>
      {(title || action) && (
        <header className={cx("flex items-start justify-between gap-3", padded ? "mb-4" : "px-5 pt-5 mb-3")}>
          <div>
            {title && <h2 className="text-base font-semibold text-ink-900">{title}</h2>}
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
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", toneClass[tone], className)}>{children}</span>;
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
      <div className="h-2 w-full rounded-full bg-stone-200/70 overflow-hidden">
        <div className={cx("h-full rounded-full transition-all", toneBar[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 7, tone = "brand", children }: { value: number; size?: number; stroke?: number; tone?: Tone; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const colour = { neutral: "#a8a29e", danger: "#c6603c", warn: "#cd9d43", info: "#5c8286", success: "#718a5a", brand: "#664f36" }[tone];
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e8dfcc" strokeWidth={stroke} fill="none" />
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
    <div className={cx("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)} style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, hsl(${hue} 55% 45%), hsl(${(hue + 30) % 360} 60% 35%))` }}>
      {initials}
    </div>
  );
}

export function EmptyState({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line py-8 text-center text-sm text-mute">
      {icon}
      <p className="max-w-xs">{children}</p>
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone }) {
  return (
    <div className="card p-4">
      <div className="label">{label}</div>
      <div className={cx("mt-1 text-2xl font-semibold display tabular-nums", tone === "danger" && "text-coral-600", tone === "warn" && "text-saffron-600", tone === "success" && "text-moss-600")}>{value}</div>
      {hint && <div className="text-xs text-mute mt-0.5">{hint}</div>}
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <div className="label mb-1">{eyebrow}</div>}
        <h1 className="text-2xl md:text-3xl font-semibold text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-mute max-w-2xl">{subtitle}</p>}
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
