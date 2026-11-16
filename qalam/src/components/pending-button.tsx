"use client";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";

export function PendingButton({ children, disabled, pendingLabel = "Saving…", iconOnly = false, ...props }: ComponentProps<"button"> & { pendingLabel?: string; iconOnly?: boolean }) {
  const { pending, data } = useFormStatus();
  const selected = !props.name || data?.get(props.name) === props.value;
  const busy = pending && selected;
  return <button {...props} type="submit" disabled={disabled || pending} aria-busy={busy} aria-label={iconOnly ? (busy ? pendingLabel : props["aria-label"] ?? props.title) : props["aria-label"]}>
    <span className="pending-button-stack">
      <span className="pending-button-content" style={{ visibility: busy ? "hidden" : undefined }} aria-hidden={busy || undefined}>{children}</span>
      <span className="pending-button-content" style={{ visibility: busy ? undefined : "hidden" }} aria-hidden={!busy || undefined} role={busy ? "status" : undefined}>
        <LoaderCircle size={iconOnly ? 12 : 16} className={busy ? "animate-spin shrink-0" : "shrink-0"} aria-hidden="true" /><span className={iconOnly ? "sr-only" : undefined}>{pendingLabel}</span>
      </span>
    </span>
  </button>;
}
