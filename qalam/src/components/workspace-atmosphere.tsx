import { AmbientVideo } from "./ambient-video";

/** Shared by every workspace route, so navigation keeps the same video element. */
export function WorkspaceAtmosphere() {
  return <div className="workspace-atmosphere" aria-hidden="true">
    <AmbientVideo artwork="outlines" className="workspace-film" />
    <svg className="atmosphere-books" viewBox="0 0 400 400" fill="none">
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g transform="rotate(-14 200 170)">
          <path d="M78 100c47-16 80-8 122 18 42-26 75-34 122-18v156c-48-15-82-7-122 17-40-24-74-32-122-17V100Z" />
          <path d="M200 118v155M98 128c28-7 51-2 80 14M98 151c28-7 51-2 80 14M98 174c28-7 51-2 80 14M222 142c29-16 52-21 80-14M222 165c29-16 52-21 80-14M222 188c29-16 52-21 80-14M86 268c43-10 76-3 114 19 38-22 71-29 114-19" />
        </g>
        <circle cx="324" cy="58" r="22" /><path d="M324 27v12m0 38v12m-31-31h12m38 0h12M46 300l22 38 22-38H46ZM275 325l12-12 12 12-12 12-12-12ZM55 67h18m-9-9v18" />
      </g>
    </svg>
    <svg className="atmosphere-orbits" viewBox="0 0 400 400" fill="none">
      <g stroke="currentColor" strokeWidth="1.2">
        <circle cx="200" cy="200" r="125" strokeDasharray="3 12" /><ellipse cx="200" cy="200" rx="170" ry="65" transform="rotate(-35 200 200)" /><ellipse cx="200" cy="200" rx="170" ry="65" transform="rotate(35 200 200)" /><circle cx="200" cy="200" r="12" /><circle cx="88" cy="108" r="8" /><path d="M305 283h24m-12-12v24" />
      </g>
    </svg>
  </div>;
}
