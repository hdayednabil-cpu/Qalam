"use client";
import { useState } from "react";

export function StudentPicker({ students }: { students: { id: string; name: string }[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <fieldset className="col-span-2">
      <legend className="label mb-2">Students · {selected.length} selected</legend>
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line bg-paper/50 p-2">
        {students.map((student) => <label key={student.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-ink-50">
          <input type="checkbox" name="studentId" value={student.id} checked={selected.includes(student.id)} required={selected.length === 0} onChange={(event) => setSelected((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} className="size-4 accent-ink-600" />
          {student.name}
        </label>)}
        {!students.length && <p className="p-2 text-sm text-mute">Add a student before scheduling a lesson.</p>}
      </div>
      <p className="mt-1 text-xs text-mute">Select one or more students for this lesson.</p>
    </fieldset>
  );
}
