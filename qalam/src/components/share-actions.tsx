"use client";
import { useState } from "react";
import { Copy, Check, MessageCircle } from "lucide-react";

/** Copy-to-clipboard and WhatsApp share (wa.me) for any text. */
export function ShareActions({ text, phone, labels, size = "sm" }: { text: string; phone?: string | null; labels: { copy: string; copied: string; whatsapp: string }; size?: "sm" | "md" }) {
  const [copied, setCopied] = useState(false);
  const wa = `https://wa.me/${phone ? phone.replace(/[^\d]/g, "") : ""}?text=${encodeURIComponent(text)}`;
  const cls = size === "sm" ? "btn-secondary btn-sm" : "btn-secondary";
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={cls}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {}
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? labels.copied : labels.copy}
      </button>
      <a className={cls} href={wa} target="_blank" rel="noreferrer">
        <MessageCircle size={14} />
        {labels.whatsapp}
      </a>
    </div>
  );
}
