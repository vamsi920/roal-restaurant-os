"use client";

import { useCallback, useRef, useState } from "react";
import { trialApi } from "@/components/try/trial-api";
import { cn } from "@/lib/cn";
import type { TrialPublicView } from "@/lib/trial/types";

type FileStatus = { key: string; name: string; state: "waiting" | "reading" | "done" | "error"; note?: string };

const ACCEPT =
  "image/*,.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.csv,.tsv,.txt,text/plain,text/csv";

/** Photos straight off a phone are 3–8 MB; shrink to ~2000px JPEG so each request stays small. */
async function shrinkImage(file: File): Promise<{ blob: Blob; name: string }> {
  if (!file.type.startsWith("image/") || (file.size < 1_200_000 && /jpe?g|png|webp/.test(file.type))) {
    return { blob: file, name: file.name };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) return { blob: file, name: file.name };
    return { blob, name: file.name.replace(/\.[^.]+$/, "") + ".jpg" };
  } catch {
    // The browser can't decode it (e.g. HEIC on Chrome); the server explains what to do.
    return { blob: file, name: file.name };
  }
}

/**
 * "Upload your menu in any format": photos (several pages at once), PDF, Word, Excel, CSV,
 * text, or pasted text. Files are read one after another and merged into one menu.
 */
export function MenuUpload({
  trialId,
  onUpdated,
  primaryLabel = "Upload your menu",
}: {
  trialId: string;
  onUpdated: (trial: TrialPublicView) => void;
  primaryLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadedRef = useRef(false);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");

  const patch = (key: string, next: Partial<FileStatus>) =>
    setFiles((list) => list.map((f) => (f.key === key ? { ...f, ...next } : f)));

  const send = useCallback(
    async (key: string, input: { file?: Blob; fileName?: string; text?: string }) => {
      patch(key, { state: "reading" });
      const res = await trialApi.uploadMenu(trialId, { ...input, append: uploadedRef.current });
      if (res.ok) {
        uploadedRef.current = true;
        onUpdated(res.data.trial);
        patch(key, { state: "done", note: `${res.data.added} items` });
      } else {
        patch(key, { state: "error", note: res.error });
      }
    },
    [onUpdated, trialId]
  );

  const addFiles = useCallback(
    async (list: FileList | File[]) => {
      const picked = Array.from(list).slice(0, 12);
      if (!picked.length) return;
      const entries = picked.map((f, i) => ({ key: `${Date.now()}-${i}-${f.name}`, name: f.name, state: "waiting" as const }));
      setFiles((prev) => [...prev, ...entries]);
      setBusy(true);
      for (let i = 0; i < picked.length; i += 1) {
        const { blob, name } = await shrinkImage(picked[i]);
        await send(entries[i].key, { file: blob, fileName: name });
      }
      setBusy(false);
    },
    [send]
  );

  const submitPaste = useCallback(async () => {
    const text = pasted.trim();
    if (!text) return;
    const key = `paste-${Date.now()}`;
    setFiles((prev) => [...prev, { key, name: "Pasted menu", state: "waiting" }]);
    setBusy(true);
    await send(key, { text });
    setBusy(false);
    setPasted("");
    setPasting(false);
  }, [pasted, send]);

  return (
    <div className="sf__upload">
      <button
        type="button"
        className={cn("sf__drop", dragging && "is-dragging")}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
        disabled={busy}
      >
        <span className="sf__drop-icon" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
        </span>
        <span className="sf__drop-title">{busy ? "Reading your menu…" : primaryLabel}</span>
        <span className="sf__drop-sub">Photos of each page, PDF, Word, Excel or CSV. Any format works.</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {files.length ? (
        <ul className="sf__files" aria-live="polite">
          {files.map((f) => (
            <li key={f.key} className={cn("sf__file", `is-${f.state}`)}>
              <span className="sf__file-name">{f.name}</span>
              <span className="sf__file-state">
                {f.state === "waiting" ? "Waiting" : f.state === "reading" ? "Reading…" : f.note}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {pasting ? (
        <div className="sf__paste">
          <textarea
            className="sf__textarea"
            placeholder={"Paste your menu here, e.g.\nMargherita Pizza  14.00\nGarlic Knots  6.50"}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={6}
            disabled={busy}
          />
          <button type="button" className="btn-primary" onClick={submitPaste} disabled={busy || !pasted.trim()}>
            Read pasted menu
          </button>
        </div>
      ) : (
        <button type="button" className="sf__text-btn" onClick={() => setPasting(true)} disabled={busy}>
          Or paste your menu as text
        </button>
      )}
    </div>
  );
}
