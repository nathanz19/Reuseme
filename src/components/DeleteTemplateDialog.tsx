"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function DeleteTemplateDialog({ name, onCancel, onConfirm }: {
  name: string; onCancel: () => void; onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return createPortal(<dialog ref={ref} onCancel={onCancel} aria-labelledby="delete-template-title" aria-describedby="delete-template-note"
    className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl bg-surface p-6 text-ink shadow-xl backdrop:bg-black/40 print:hidden">
    <h2 id="delete-template-title" className="text-lg font-semibold">Delete saved template?</h2>
    <p id="delete-template-note" className="mt-3 text-sm leading-relaxed text-ink-muted">Remove “{name}” from your template list? Documents already using it will keep their current formatting. To save it again later, upload it again.</p>
    <div className="mt-6 flex justify-end gap-3"><button type="button" autoFocus onClick={onCancel} className="btn-secondary">Cancel</button><button type="button" onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete template</button></div>
  </dialog>, document.body);
}
