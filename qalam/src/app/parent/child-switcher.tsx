import { PendingButton } from "@/components/pending-button";
import { Avatar, cx } from "@/components/ui";
import { switchChild } from "./actions";

export function ChildSwitcher({ kids, currentId, back }: { kids: { id: string; name: string; hue: number; grade: string | null }[]; currentId: string; back: string }) {
  if (kids.length < 2) return null;
  return (
    <form action={switchChild} aria-label="Choose a child" className="mb-5 flex flex-wrap gap-2">
      <input type="hidden" name="back" value={back} />
      {kids.map((k) => (
          <PendingButton key={k.id} name="studentId" value={k.id} aria-pressed={k.id === currentId} pendingLabel={`Opening ${k.name}…`} className={cx("flex items-center gap-2 min-h-11 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors", k.id === currentId ? "border-ink-800 bg-ink-800 text-white" : "border-line bg-surface hover:bg-ink-50")}>
            <Avatar name={k.name} hue={k.hue} size={22} /> {k.name}
          </PendingButton>
      ))}
    </form>
  );
}
