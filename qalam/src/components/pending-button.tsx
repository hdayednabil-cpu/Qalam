"use client";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";

export function PendingButton({ children, disabled, pendingLabel = "Saving…", ...props }: ComponentProps<"button"> & { pendingLabel?: string }) {
  const { pending, data } = useFormStatus();
  const selected = !props.name || data?.get(props.name) === props.value;
  return <button {...props} type="submit" disabled={disabled || pending} aria-busy={pending && selected}>
    {pending && selected ? <><LoaderCircle size={16} className="animate-spin" aria-hidden="true" /><span role="status">{pendingLabel}</span></> : children}
  </button>;
}
