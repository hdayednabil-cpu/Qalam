import { LoaderCircle } from "lucide-react";

export function WorkspaceLoading() {
  return <div className="space-y-6" role="status" aria-live="polite" aria-busy="true">
    <div className="flex items-center gap-2 text-sm font-medium text-ink-700"><LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> Loading your workspace…</div>
    <div aria-hidden="true" className="space-y-6">
      <div className="loading-placeholder h-28 rounded-2xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map(n => <div key={n} className="card space-y-4 p-5"><div className="loading-placeholder h-3 w-2/3 rounded" /><div className="loading-placeholder h-8 w-1/2 rounded-lg" /></div>)}</div>
      <div className="card space-y-5 p-6">{[0, 1, 2, 3].map(n => <div key={n} className="loading-placeholder h-10 rounded-lg" />)}</div>
    </div>
  </div>;
}
