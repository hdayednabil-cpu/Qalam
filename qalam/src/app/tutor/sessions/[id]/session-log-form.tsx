"use client";
import { useState } from "react";
import type { Mastery } from "@/db/schema";

type Topic = { id: string; name: string; code: string | null; sectionName: string | null; mastery: Mastery | null; isCurrent: boolean };
type StudentBlock = { id: string; name: string; topics: Topic[]; preselected: string[]; nextSteps: { id: string; text: string }[]; assessment: string | null; existing: Record<string, Mastery | null> };

const LEVELS: Mastery[] = ["needs_work", "developing", "comfortable", "strong"];

export function SessionLogForm({ action, sessionId, students, defaults, labels }: {
  action: (fd: FormData) => void | Promise<void>;
  sessionId: string;
  students: StudentBlock[];
  defaults: { sharedSummary: string; privateNotes: string; planForNext: string; status: string };
  labels: Record<string, string>;
}) {
  const [status, setStatus] = useState(defaults.status === "no_show" ? "no_show" : "completed");
  const [selected, setSelected] = useState<Record<string, Set<string>>>(() => Object.fromEntries(students.map((s) => [s.id, new Set(s.preselected)])));
  const [filter, setFilter] = useState("");
  const [hwOpen, setHwOpen] = useState<Record<string, boolean>>({});

  const toggle = (sid: string, tid: string) =>
    setSelected((prev) => {
      const next = new Set(prev[sid]);
      if (next.has(tid)) next.delete(tid);
      else next.add(tid);
      return { ...prev, [sid]: next };
    });

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="flex gap-2">
        {(["completed", "no_show"] as const).map((st) => (
          <label key={st} className={`btn ${status === st ? "bg-ink-800 text-white" : "bg-ink-50 text-ink-800"}`}>
            <input type="radio" name="status" value={st} checked={status === st} onChange={() => setStatus(st)} className="sr-only" />
            {st === "completed" ? labels.markCompleted : labels.markNoShow}
          </label>
        ))}
      </div>

      {status === "completed" &&
        students.map((s) => {
          const sel = selected[s.id];
          const sections = new Map<string, Topic[]>();
          for (const tp of s.topics) {
            if (filter && !tp.name.toLowerCase().includes(filter.toLowerCase()) && !sel.has(tp.id)) continue;
            const k = tp.sectionName ?? "Topics";
            if (!sections.has(k)) sections.set(k, []);
            sections.get(k)!.push(tp);
          }
          return (
            <div key={s.id} className="card p-5 space-y-4">
              <input type="hidden" name="studentId" value={s.id} />
              {students.length > 1 && <h3 className="font-semibold">{s.name}</h3>}
              {s.nextSteps.length > 0 && (
                <div>
                  <div className="label mb-1.5">{labels.nextSteps}</div>
                  <ul className="space-y-1">
                    {s.nextSteps.map((n) => (
                      <li key={n.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="stepDone" value={n.id} className="size-4" />
                        <span>{n.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="label">{labels.topicsCovered} · {sel.size} selected</div>
                  <input value={filter} onChange={(e) => setFilter(e.target.value)} className="input py-1 text-sm max-w-48" placeholder={labels.search} />
                </div>
                <div className="max-h-80 overflow-y-auto rounded-xl border border-line divide-y divide-line/60">
                  {[...sections.entries()].map(([name, topics]) => (
                    <div key={name}>
                      <div className="sticky top-0 bg-stone-50 px-3 py-1 text-xs font-semibold text-mute">{name}</div>
                      {topics.map((tp) => {
                        const on = sel.has(tp.id);
                        return (
                          <div key={tp.id} className={`px-3 py-1.5 ${on ? "bg-ink-50/60" : ""}`}>
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" name={`topics:${s.id}`} value={tp.id} checked={on} onChange={() => toggle(s.id, tp.id)} className="size-4" />
                              <span className="text-xs text-mute w-9">{tp.code}</span>
                              <span className={tp.isCurrent ? "font-semibold" : ""}>{tp.name}</span>
                            </label>
                            {on && (
                              <div className="mt-1 ml-6 flex flex-wrap items-center gap-1.5">
                                {LEVELS.map((l) => (
                                  <label key={l} className="cursor-pointer">
                                    <input type="radio" name={`mastery:${s.id}:${tp.id}`} value={l} defaultChecked={(s.existing[tp.id] ?? tp.mastery) === l} className="peer sr-only" />
                                    <span className="inline-block rounded-full border border-line px-2 py-0.5 text-xs peer-checked:bg-ink-800 peer-checked:text-white peer-checked:border-ink-800">{labels[`m_${l}`]}</span>
                                  </label>
                                ))}
                                <input name={`note:${s.id}:${tp.id}`} className="input py-0.5 text-xs max-w-56" placeholder={labels.topicNote} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="label mb-1.5 block">{labels.assessment}</span>
                <input name={`assessment:${s.id}`} className="input" defaultValue={s.assessment ?? ""} placeholder={labels.assessmentHint} />
              </label>
              <div>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setHwOpen((p) => ({ ...p, [s.id]: !p[s.id] }))}>
                  {hwOpen[s.id] ? "−" : "+"} {labels.assignHomework}
                </button>
                {hwOpen[s.id] && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input name={`hw:${s.id}:title`} className="input" placeholder={labels.hwTitle} />
                    <select name={`hw:${s.id}:due`} className="input" defaultValue="3">
                      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                        <option key={d} value={d}>{labels.dueIn} {d}d</option>
                      ))}
                    </select>
                    <input name={`hw:${s.id}:instructions`} className="input sm:col-span-2" placeholder={labels.hwInstructions} />
                  </div>
                )}
              </div>
            </div>
          );
        })}

      <div className="card p-5 space-y-3">
        {status === "completed" ? (
          <>
            <label className="block">
              <span className="label mb-1.5 block">{labels.sharedSummary}</span>
              <input name="sharedSummary" className="input" defaultValue={defaults.sharedSummary} placeholder={labels.sharedHint} required />
            </label>
            <label className="block">
              <span className="label mb-1.5 block">{labels.planForNext}</span>
              <input name="planForNext" className="input" defaultValue={defaults.planForNext} placeholder={labels.planHint} />
            </label>
          </>
        ) : (
          <input type="hidden" name="sharedSummary" value="" />
        )}
        <label className="block">
          <span className="label mb-1.5 block">{labels.privateNotes}</span>
          <textarea name="privateNotes" className="input min-h-20" defaultValue={defaults.privateNotes} />
        </label>
      </div>
      <button className="btn-primary w-full sm:w-auto" type="submit">{labels.save}</button>
    </form>
  );
}
