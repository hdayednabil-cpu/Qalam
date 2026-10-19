import { useId, type ReactNode } from "react";
import Link from "@/components/app-link";
import { ArrowUpRight } from "lucide-react";
import { AmbientArt } from "./ambient-motion";

/** Qalam's learning constellation: decorative, lightweight and independent of student data. */
export function LearningOrbit({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <AmbientArt className={`learning-orbit ${className}`}>
      <svg viewBox="0 0 400 400" fill="none" className="h-full w-full">
        <defs>
          <linearGradient id={`${id}-orbit`} x1="70" y1="50" x2="330" y2="350" gradientUnits="userSpaceOnUse"><stop stopColor="#80F8DF" /><stop offset=".5" stopColor="#8CA4FF" /><stop offset="1" stopColor="#C5A2FF" /></linearGradient>
          <radialGradient id={`${id}-core`}><stop stopColor="#A7FAE8" /><stop offset=".4" stopColor="#7E9FFF" /><stop offset="1" stopColor="#6552E8" /></radialGradient>
        </defs>
        <circle cx="200" cy="200" r="168" stroke="white" strokeOpacity=".1" strokeDasharray="2 9" />
        <ellipse cx="200" cy="200" rx="166" ry="70" transform="rotate(-32 200 200)" stroke={`url(#${id}-orbit)`} strokeWidth="1.5" />
        <ellipse cx="200" cy="200" rx="150" ry="90" transform="rotate(50 200 200)" stroke={`url(#${id}-orbit)`} strokeOpacity=".65" />
        <circle cx="200" cy="200" r="105" stroke="white" strokeOpacity=".14" />
        <circle cx="200" cy="200" r="59" fill={`url(#${id}-core)`} />
        <path d="M222 175h-25c-15 0-25 10-25 25s10 25 25 25h25v-50ZM198 201l26 34M198 201h24" stroke="white" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="61" cy="276" r="8" fill="#80F8DF" /><circle cx="61" cy="276" r="15" stroke="#80F8DF" strokeOpacity=".3" />
        <circle cx="291" cy="91" r="6" fill="#D4BAFF" /><circle cx="333" cy="222" r="4" fill="#A7BEFF" />
        <path d="m110 91 4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" fill="#80F8DF" />
        <path d="m284 310 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#D4BAFF" />
      </svg>
    </AmbientArt>
  );
}

export function JourneyHero({ eyebrow, title, children, href, action }: { eyebrow: string; title: string; children: ReactNode; href: string; action: string }) {
  return (
    <section className="journey-hero relative isolate overflow-hidden rounded-2xl p-5 text-white sm:p-6">
      <LearningOrbit className="pointer-events-none absolute -right-12 -top-16 size-64 opacity-40 sm:right-0 sm:-top-12 sm:size-72" />
      <div className="relative max-w-xl sm:pr-24">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-[#a5f5e0]">{eyebrow}</p>
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-200">{children}</p>
        <Link href={href} className="mt-4 inline-flex min-h-11 items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-ink-100">{action}<ArrowUpRight size={16} /></Link>
      </div>
    </section>
  );
}
