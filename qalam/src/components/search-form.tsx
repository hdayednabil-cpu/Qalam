"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Search } from "lucide-react";

export function SearchForm({ query, placeholder, label }: { query: string; placeholder: string; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <form action="/tutor/search" className="flex max-w-xl gap-2" onSubmit={event => {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get("q") ?? "");
    startTransition(() => router.push(`/tutor/search?${new URLSearchParams({ q })}`));
  }}>
    <input name="q" defaultValue={query} className="input" placeholder={placeholder} aria-label={label} type="search" autoFocus />
    <button className="btn-primary" type="submit" disabled={pending} aria-busy={pending}>
      {pending ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}<span role={pending ? "status" : undefined}>{pending ? "Searching…" : label}</span>
    </button>
  </form>;
}
