"use client";
import { useEffect, useRef, useState } from "react";
import { Copy, Check, LoaderCircle, MessageCircle } from "lucide-react";

/** Copy-to-clipboard and WhatsApp share (wa.me) for any text. */
export function ShareActions({ text, phone, labels, size = "sm" }: { text: string; phone?: string | null; labels: { copy: string; copied: string; whatsapp: string }; size?: "sm" | "md" }) {
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const wa = `https://wa.me/${phone ? phone.replace(/[^\d]/g, "") : ""}?text=${encodeURIComponent(text)}`;
  const cls = size === "sm" ? "btn-secondary btn-sm" : "btn-secondary";
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={cls}
        disabled={pending}
        aria-busy={pending}
        onClick={async () => {
          setPending(true);
          setError(false);
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), 1500);
          } catch { setCopied(false); setError(true); }
          finally { setPending(false); }
        }}
      >
        {pending ? <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> : copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        <span role="status">{pending ? "Copying…" : copied ? labels.copied : labels.copy}</span>
      </button>
      <a className={`qalam-link ${cls}`} href={wa} target="_blank" rel="noreferrer">
        <MessageCircle size={14} />
        {labels.whatsapp}
      </a>
      {error && <p role="alert" className="w-full text-xs text-coral-700">Copying was blocked. Select and copy the text manually.</p>}
    </div>
  );
}
