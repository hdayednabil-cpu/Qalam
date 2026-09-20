/**
 * AmbientBackground -- a warm, slowly-drifting field of light standing in
 * for the mood-board photography (arched glass, golden-hour brass, sage
 * greenery) without using any licensed stock imagery. Pure CSS/SVG, no
 * client JS, safe to render from a Server Component. Motion is defined in
 * globals.css and respects prefers-reduced-motion.
 *
 * Render it as the first child of a `relative` (or `relative isolate`)
 * container; it positions itself absolutely and never blocks pointer
 * events.
 */
export function AmbientBackground({ className = "", variant = "dark" }: { className?: string; variant?: "dark" | "paper" }) {
  const isDark = variant === "dark";
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {/* base wash */}
      <div className="absolute inset-0" style={{ background: isDark ? "radial-gradient(120% 90% at 15% 0%, #3c2d1f 0%, #241b12 46%, #17110a 100%)" : "radial-gradient(120% 90% at 20% 0%, #fffcf6 0%, #f7f2e7 60%, #efe6d3 100%)" }} />

      {/* drifting brass + sage glow */}
      <div className="ambient-blob-a absolute -top-[20%] -left-[10%] size-[60%] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(226,191,110,0.35) 0%, rgba(226,191,110,0) 70%)" }} />
      <div className="ambient-blob-b absolute top-[30%] -right-[15%] size-[55%] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(113,138,90,0.28) 0%, rgba(113,138,90,0) 70%)" }} />
      <div className="ambient-blob-a absolute bottom-[-25%] left-[20%] size-[50%] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(92,130,134,0.22) 0%, rgba(92,130,134,0) 70%)", animationDelay: "-9s" }} />

      {/* row of receding arches, echoing the glass-arch atrium in the mood board */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMax slice" viewBox="0 0 800 500" fill="none">
        {[0, 1, 2, 3, 4].map((i) => {
          const w = 130 - i * 6;
          const x = 90 + i * 150;
          const baseY = 500;
          const topY = 120 + i * 4;
          return (
            <path
              key={i}
              d={`M ${x - w} ${baseY} L ${x - w} ${topY + w} A ${w} ${w} 0 0 1 ${x + w} ${topY + w} L ${x + w} ${baseY}`}
              stroke={isDark ? "#e2bf6e" : "#856a49"}
              strokeOpacity={0.14 - i * 0.015}
              strokeWidth="1.5"
            />
          );
        })}
      </svg>

      {/* fine horizontal glints, like light catching brass shelf-edges */}
      <div className="ambient-shimmer absolute inset-x-0 top-1/3 h-px" style={{ background: isDark ? "linear-gradient(90deg, transparent, rgba(226,191,110,0.5), transparent)" : "linear-gradient(90deg, transparent, rgba(133,106,73,0.35), transparent)" }} />

      {/* vignette for legibility of foreground content */}
      <div className="absolute inset-0" style={{ background: isDark ? "linear-gradient(180deg, rgba(20,15,10,0.1) 0%, rgba(20,15,10,0.5) 100%)" : "linear-gradient(180deg, rgba(247,242,231,0) 60%, rgba(247,242,231,0.6) 100%)" }} />
    </div>
  );
}
