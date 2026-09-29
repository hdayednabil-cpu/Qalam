"use client";

/**
 * Small, reusable framer-motion primitives used to give the app real,
 * deliberate motion (entrance reveals, count-up stats, animated progress)
 * without scattering animation logic across every page.
 *
 * These wrap Client Components only; the pages that use them stay mostly
 * Server Components apart from the motion wrapper itself, per Next.js'
 * "Server Components can render Client Component children" pattern.
 */
import { animate, motion, useInView, useMotionValue, useTransform, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import type { Tone } from "./ui";

const EASE = [0.16, 1, 0.3, 1] as const;

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

/** Fades + lifts its children into place the first time they scroll into view. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div className={className} initial={reduced ? false : "hidden"} whileInView="show" viewport={{ once: true, margin: "-20px" }} variants={revealVariants} transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

/** Wrap a group of `StaggerItem`s in this to reveal them one after another. */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div className={className} initial={reduced ? false : "hidden"} whileInView="show" viewport={{ once: true, margin: "-20px" }} variants={{ hidden: {}, show: { transition: { staggerChildren: reduced ? 0 : 0.05 } } }}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div className={className} variants={revealVariants} transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}>
      {children}
    </motion.div>
  );
}

/** Animates a number counting up to `value` once it scrolls into view. */
export function CountUp({ value, duration = 1.1, suffix = "", prefix = "", className }: { value: number; duration?: number; suffix?: string; prefix?: string; className?: string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${prefix}${Math.round(v)}${suffix}`);

  useEffect(() => {
    if (reduced) { mv.set(value); return; }
    if (!inView) return;
    const controls = animate(mv, value, { duration, ease: EASE });
    return () => controls.stop();
  }, [inView, value, duration, mv, reduced]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}

const TONE_HEX: Record<Tone, string> = {
  neutral: "#94a3b8",
  danger: "var(--color-coral-500)",
  warn: "var(--color-saffron-400)",
  info: "var(--color-sky-500)",
  success: "var(--color-moss-500)",
  brand: "var(--color-ink-500)",
};

/** Drop-in animated replacement for `Ring` -- the stroke sweeps in on first view. */
export function MotionRing({ value, size = 64, stroke = 7, tone = "brand", children }: { value: number; size?: number; stroke?: number; tone?: Tone; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inView = useInView(wrapRef, { once: true, margin: "-20px" });

  return (
    <div ref={wrapRef} className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-line)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={TONE_HEX[tone]}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduced ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: (inView || reduced) ? c - (c * clamped) / 100 : c }}
          transition={{ duration: reduced ? 0 : 0.6, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">{children ?? `${clamped}%`}</div>
    </div>
  );
}

const TONE_BAR: Record<Tone, string> = {
  neutral: "bg-stone-300",
  danger: "bg-coral-500",
  warn: "bg-saffron-400",
  info: "bg-sky-500",
  success: "bg-moss-500",
  brand: "bg-ink-500",
};

/** Drop-in animated replacement for `Progress` -- the bar fills in on first view. */
export function MotionProgress({ value, tone = "brand", className, label }: { value: number; tone?: Tone; className?: string; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inView = useInView(wrapRef, { once: true, margin: "-20px" });
  return (
    <div ref={wrapRef} className={className}>
      {label && (
        <div className="flex justify-between text-xs text-mute mb-1">
          <span>{label}</span>
          <span className="tabular-nums">{clamped}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <motion.div className={`h-full rounded-full ${TONE_BAR[tone]}`} initial={reduced ? false : { width: 0 }} animate={{ width: (inView || reduced) ? `${clamped}%` : 0 }} transition={{ duration: reduced ? 0 : 0.6, ease: EASE }} />
      </div>
    </div>
  );
}
