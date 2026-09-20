/**
 * OrreryMark -- the brand's signature motif: a small brass orrery (the
 * concentric rotating-sphere instrument from the reference mood board),
 * rendered in pure SVG + CSS so it needs no images, licences or JS.
 *
 * Ring colour tracks `currentColor`, so it inherits whatever text colour
 * its wrapper sets -- ink on paper, white on the dark hero panel.
 * All motion is defined in globals.css and is switched off under
 * prefers-reduced-motion there.
 */
export function OrreryMark({ size = 28, className = "", glow = false }: { size?: number; className?: string; glow?: boolean }) {
  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {glow && <span className="absolute inset-[-30%] rounded-full bg-saffron-400/25 blur-xl ambient-shimmer" aria-hidden="true" />}
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className="relative" style={{ overflow: "visible" }}>
        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth="1" />
        <circle cx="50" cy="50" r="31" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" />
        <circle cx="50" cy="50" r="18" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />

        <g className="orrery-ring-1" style={{ transformOrigin: "50px 50px" }}>
          <circle cx="50" cy="6" r="3.4" className="fill-saffron-400" />
        </g>
        <g className="orrery-ring-2" style={{ transformOrigin: "50px 50px" }}>
          <circle cx="50" cy="19" r="2.5" className="fill-saffron-300" />
        </g>
        <g className="orrery-ring-3" style={{ transformOrigin: "50px 50px" }}>
          <circle cx="50" cy="32" r="1.9" className="fill-moss-300" />
        </g>

        <circle cx="50" cy="50" r="5.2" className="fill-saffron-400 orrery-core" style={{ transformOrigin: "50px 50px" }} />
      </svg>
    </span>
  );
}

/** Larger decorative variant for hero panels -- extra outer ring + faint ticks. */
export function OrreryHero({ size = 260, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <span className="absolute inset-[6%] rounded-full bg-saffron-400/15 blur-2xl ambient-shimmer" aria-hidden="true" />
      <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true" style={{ overflow: "visible" }} className="relative text-white">
        <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="1" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" />
        <circle cx="100" cy="100" r="48" fill="none" stroke="currentColor" strokeOpacity="0.24" strokeWidth="1" />
        <circle cx="100" cy="100" r="26" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />

        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const x1 = 100 + Math.cos(a) * 96, y1 = 100 + Math.sin(a) * 96;
          const x2 = 100 + Math.cos(a) * 100, y2 = 100 + Math.sin(a) * 100;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity="0.16" strokeWidth="1" />;
        })}

        <g className="orrery-ring-1" style={{ transformOrigin: "100px 100px" }}>
          <circle cx="100" cy="8" r="5" className="fill-saffron-400" />
          <circle cx="100" cy="8" r="9" fill="none" stroke="var(--color-saffron-300)" strokeOpacity="0.4" strokeWidth="1" />
        </g>
        <g className="orrery-ring-2" style={{ transformOrigin: "100px 100px" }}>
          <circle cx="100" cy="30" r="3.6" className="fill-saffron-300" />
        </g>
        <g className="orrery-ring-3" style={{ transformOrigin: "100px 100px" }}>
          <circle cx="100" cy="52" r="2.8" className="fill-moss-300" />
        </g>
        <g className="orrery-ring-2" style={{ transformOrigin: "100px 100px", animationDirection: "reverse", animationDuration: "18s" }}>
          <circle cx="100" cy="74" r="2.2" className="fill-sky-300" />
        </g>

        <circle cx="100" cy="100" r="9" className="fill-saffron-400 orrery-core" style={{ transformOrigin: "100px 100px" }} />
      </svg>
    </span>
  );
}
