"use client";

import NextLink, { useLinkStatus } from "next/link";
import { createPortal } from "react-dom";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";

function NavigationFeedback() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <>
    <span className="link-pending-marker" aria-hidden="true" />
    {createPortal(<div className="navigation-feedback" role="status" aria-live="polite">
      <span className="navigation-progress" aria-hidden="true" />
      <span className="navigation-status"><LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Opening page…</span>
    </div>, document.body)}
  </>;
}

/** Real router pending state; native link, prefetch and modified-click behaviour stay intact. */
export default function AppLink({ children, className = "", ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} className={`qalam-link ${className}`}>
    {children}<NavigationFeedback />
  </NextLink>;
}
