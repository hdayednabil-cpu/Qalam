"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";

const KEY = "qalam:ambient-motion:v1";
const MotionContext = createContext({ paused: false, reduced: false, toggle: () => {} });

export function AmbientMotionProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReduced(preference.matches);
    const syncVisibility = () => { document.documentElement.dataset.pageHidden = String(document.hidden); };
    const syncStorage = () => {
      try { const value = localStorage.getItem(KEY) === "paused"; setPaused(value); document.documentElement.dataset.ambientMotion = value ? "paused" : "playing"; } catch { /* Storage is optional. */ }
    };
    syncPreference(); syncVisibility(); syncStorage();
    preference.addEventListener("change", syncPreference);
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("storage", syncStorage);
    return () => {
      preference.removeEventListener("change", syncPreference);
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);
  const toggle = () => {
    const next = !paused;
    setPaused(next);
    document.documentElement.dataset.ambientMotion = next ? "paused" : "playing";
    try { localStorage.setItem(KEY, next ? "paused" : "playing"); } catch { /* Keep the in-session preference. */ }
  };
  return <MotionContext.Provider value={{ paused, reduced, toggle }}>{children}</MotionContext.Provider>;
}

export function MotionToggle() {
  const { paused, reduced, toggle } = useContext(MotionContext);
  const label = reduced ? "Animations reduced by your device settings" : paused ? "Resume background animation" : "Pause background animation";
  return <button type="button" onClick={toggle} disabled={reduced} aria-label="Background animation" title={label} aria-pressed={!paused && !reduced} className="motion-toggle inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line bg-surface text-ink-700 disabled:opacity-50">
    {paused || reduced ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
  </button>;
}

/** Visibility changes update one DOM attribute, never React state or a frame loop. */
export function AmbientArt({ children, className, inline = false }: { children: ReactNode; className?: string; inline?: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => { element.dataset.inView = String(entry.isIntersecting); });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const props = { className, "data-ambient": "", "data-in-view": "false", "aria-hidden": true as const, ref: (element: HTMLElement | null) => { ref.current = element; } };
  return inline ? <span {...props}>{children}</span> : <div {...props}>{children}</div>;
}
