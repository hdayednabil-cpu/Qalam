"use client";

import { useEffect, useRef } from "react";

/** A poster paints immediately; decorative video starts after the page is ready. */
export function AmbientVideo({ artwork, className = "" }: { artwork: "welcome" | "outlines"; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    let visible = false;
    let disposed = false;
    let ready = false;
    let scheduled = false;
    let cancelIdle: (() => void) | undefined;

    const sync = () => {
      if (disposed) return;
      if (!visible || document.hidden || motion.matches || connection?.saveData) {
        video.pause();
        return;
      }
      if (!ready) return;
      if (!video.hasAttribute("src")) {
        const mobile = window.matchMedia("(max-width: 767px)").matches;
        video.src = `/media/qalam/${artwork}${mobile ? "-mobile" : ""}.v2.mp4`;
      }
      void video.play().catch(() => { /* Autoplay restrictions keep the poster visible. */ });
    };
    const afterLoad = () => {
      if (scheduled) return;
      scheduled = true;
      const start = () => { ready = true; sync(); };
      if (typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(start, { timeout: 1500 });
        cancelIdle = () => window.cancelIdleCallback(id);
      } else {
        const id = window.setTimeout(start, 150);
        cancelIdle = () => window.clearTimeout(id);
      }
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    if (observer) observer.observe(video);
    else visible = true;
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
    return () => {
      disposed = true;
      cancelIdle?.();
      observer?.disconnect();
      window.removeEventListener("load", afterLoad);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [artwork]);

  return <div className={`ambient-video ambient-video-${artwork} ${className}`} aria-hidden="true">
    <video ref={ref} muted loop playsInline preload="none" disablePictureInPicture disableRemotePlayback tabIndex={-1}
      onPlaying={(event) => { event.currentTarget.dataset.playing = "true"; }}
      onError={(event) => { delete event.currentTarget.dataset.playing; }} />
  </div>;
}
