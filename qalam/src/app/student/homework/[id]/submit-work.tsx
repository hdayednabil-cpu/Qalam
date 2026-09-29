"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Images, Trash2, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { submitHomeworkAction } from "../../actions";

type Page = { key: string; name: string; preview: string | null; fileId?: string; status: "converting" | "uploading" | "ready" | "error"; error?: string };
import { MAX_PAGES, MAX_FILE_BYTES } from "@/lib/upload-limits";

function isHeic(f: File) {
  return /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name);
}

/** Downscale on the client so uploads are fast on mobile data; the server normalises again. */
async function shrink(blob: Blob): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && blob.size < 2_000_000) return blob;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", 0.85));
  } catch {
    return blob;
  }
}

export function SubmitWork({ homeworkId, resubmit, labels }: { homeworkId: string; resubmit: boolean; labels: Record<string, string> }) {
  const [pages, setPages] = useState<Page[]>([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const adding = useRef(false);
  const pageCount = useRef(0);
  const cam = useRef<HTMLInputElement>(null);
  const lib = useRef<HTMLInputElement>(null);

  const update = (key: string, patch: Partial<Page>) => setPages((p) => p.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  async function addFiles(files: FileList | null) {
    if (!files || adding.current) return;
    adding.current = true;
    try {
      setError(null);
      for (const file of Array.from(files)) {
        if (pageCount.current >= MAX_PAGES) {
          setError(labels.maxPages);
          break;
        }
        if (file.size > MAX_FILE_BYTES) {
          setError(labels.tooLarge);
          continue;
        }
        pageCount.current += 1;
        const key = crypto.randomUUID();
        const isPdf = file.type === "application/pdf";
        setPages((p) => [...p, { key, name: file.name, preview: null, status: isHeic(file) ? "converting" : "uploading" }]);
        try {
          let blob: Blob = file;
          if (isHeic(file)) {
            const heic2any = (await import("heic2any")).default;
            const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
            blob = Array.isArray(out) ? out[0] : out;
          }
          if (!isPdf) blob = await shrink(blob);
          if (blob.size > MAX_FILE_BYTES) throw new Error(labels.tooLarge);
          update(key, { preview: isPdf ? null : URL.createObjectURL(blob), status: "uploading" });
          const fd = new FormData();
          fd.append("file", blob, isPdf ? file.name : file.name.replace(/\.\w+$/, "") + ".jpg");
          fd.append("homeworkId", homeworkId);
          const res = await fetch("/api/uploads", { method: "POST", body: fd });
          if (!res.ok) throw new Error(res.status === 422 ? labels.processingFailed : `Upload failed (${res.status})`);
          const data = (await res.json()) as { fileId: string };
          update(key, { fileId: data.fileId, status: "ready" });
        } catch (e) {
          update(key, { status: "error", error: (e as Error).message || labels.processingFailed });
        }
      }
    } finally { adding.current = false; }
  }

  const move = (i: number, d: -1 | 1) =>
    setPages((p) => {
      const j = i + d;
      if (j < 0 || j >= p.length) return p;
      const n = [...p];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const ready = pages.filter((p) => p.status === "ready");
  const busy = pages.some((p) => p.status === "converting" || p.status === "uploading");

  return (
    <div className="space-y-4">
      <p className="text-sm text-mute">{labels.pagesHint}</p>
      <div className="flex flex-wrap gap-2">
        <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <input ref={lib} type="file" accept="image/*,.heic,.heif,application/pdf" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <button type="button" className="btn-primary" onClick={() => cam.current?.click()}><Camera size={16} /> {labels.takePhoto}</button>
        <button type="button" className="btn-secondary" onClick={() => lib.current?.click()}><Images size={16} /> {labels.addPage}</button>
      </div>
      {pages.length > 0 && (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {pages.map((p, i) => (
            <li key={p.key} className="card overflow-hidden">
              <div className="aspect-[3/4] bg-stone-100 grid place-items-center relative">
                {p.preview ? <img src={p.preview} alt={p.name} className="h-full w-full object-cover" /> : <span className="text-xs text-mute px-2 text-center">{p.name}</span>}
                {(p.status === "converting" || p.status === "uploading") && (
                  <div className="absolute inset-0 grid place-items-center bg-white/70 text-xs font-medium"><Loader2 className="animate-spin mr-1" size={16} /> {p.status === "converting" ? labels.converting : labels.uploading}</div>
                )}
                {p.status === "error" && <div className="absolute inset-0 grid place-items-center bg-coral-100/90 text-xs text-coral-700 p-2 text-center">{p.error}</div>}
                <span className="absolute top-1 left-1 rounded-full bg-ink-900/80 text-white text-[11px] px-1.5">{i + 1}</span>
              </div>
              <div className="flex justify-between p-1">
                <button type="button" className="btn-ghost btn-sm px-2" onClick={() => move(i, -1)} title={labels.moveUp}><ArrowUp size={14} /></button>
                <button type="button" className="btn-ghost btn-sm px-2" onClick={() => move(i, 1)} title={labels.moveDown}><ArrowDown size={14} /></button>
                <button type="button" className="btn-ghost btn-sm px-2 text-coral-600" onClick={() => { pageCount.current -= 1; if (p.preview) URL.revokeObjectURL(p.preview); setPages((x) => x.filter((y) => y.key !== p.key)); }} disabled={busy} title={labels.remove}><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="input min-h-20" placeholder={labels.commentPlaceholder} />
      {error && <p className="rounded-xl bg-coral-100 px-3 py-2 text-sm text-coral-700">{error}</p>}
      <button
        type="button"
        className="btn-accent w-full sm:w-auto"
        disabled={!ready.length || busy || pending}
        onClick={() =>
          start(async () => {
            const r = await submitHomeworkAction(homeworkId, ready.map((p) => p.fileId!), comment);
            if (!r.ok) setError(r.error);
            else router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" size={16} /> : null} {resubmit ? labels.resubmit : labels.submitWork} {ready.length ? `(${ready.length})` : ""}
      </button>
    </div>
  );
}
