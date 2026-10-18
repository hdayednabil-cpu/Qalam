"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Decorative motion runs automatically; hidden tabs do not spend animation work. */
export function AmbientMotionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const syncVisibility = () => { document.documentElement.dataset.pageHidden = String(document.hidden); };
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, []);
  return children;
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
  const props = { className, "data-ambient": "", "data-in-view": "true", "aria-hidden": true as const, ref: (element: HTMLElement | null) => { ref.current = element; } };
  return inline ? <span {...props}>{children}</span> : <div {...props}>{children}</div>;
}
