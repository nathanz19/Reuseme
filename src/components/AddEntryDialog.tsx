"use client";

import { useEffect, useRef, useState } from "react";
import { useResumeStore } from "@/store/resumeStore";
import type { AccomplishmentBlock } from "@/types/resume";
import type { VaultCategory } from "@/lib/vaultCategories";

interface AddEntryDialogProps {
  category: VaultCategory;
  block?: AccomplishmentBlock;
  editing?: boolean;
  onClose: () => void;
}

const fieldClass = "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm";

export function AddEntryDialog({ category, block, editing = false, onClose }: AddEntryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [extraFields, setExtraFields] = useState<number[]>([]);
  const preset = useResumeStore((s) => s.presets.find((p) => p.id === s.activePresetId)!);
  const createVaultBlock = useResumeStore((s) => s.createVaultBlock);
  const updateVaultBlock = useResumeStore((s) => s.updateVaultBlock);
  const commit = useResumeStore((s) => s.commit);
  const existing = preset.additionalSections?.find((s) => s.id === category.id);
  const isCustom = category.id.startsWith("custom-");

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const input = (name: string, label: string, defaultValue = "", required = false) => (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input name={name} defaultValue={defaultValue} required={required} pattern={required ? ".*\\S.*" : undefined} className={fieldClass} />
    </label>
  );

  return (
    <dialog ref={dialogRef} onCancel={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={(event) => event.stopPropagation()}
      aria-labelledby="add-entry-title"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-black/40 print:hidden">
      <form onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const read = (name: string) => String(data.get(name) ?? "").trim();
        const extras = extraFields.map((id) => {
          const label = read(`extra-label-${id}`);
          const value = read(`extra-value-${id}`);
          return label && value ? `${label}: ${value}` : "";
        }).filter(Boolean);
        if (category.kind === "blocks" && category.blockCategory) {
          const bullets = read("description").split("\n").map((line) => line.trim()).filter(Boolean);
          const saveBlock = block ? updateVaultBlock : createVaultBlock;
          saveBlock({
            id: block?.id ?? crypto.randomUUID(), category: category.blockCategory,
            title: read("title"), organization: read("organization"),
            location: read("location"), startDate: read("startDate"), endDate: read("endDate"),
            bullets: [...bullets, ...extras],
            sourceContext: block ? [read("notes"), ...extras].filter(Boolean).join("\n") : [read("description"), read("notes"), ...extras].filter(Boolean).join("\n"),
            tags: read("tags").split(",").map((tag) => tag.trim()).filter(Boolean), isArchived: block?.isArchived ?? false,
          });
        } else {
          commit((draft) => {
            const active = draft.presets.find((p) => p.id === draft.activePresetId);
            if (!active) return;
            if (category.kind === "contact") {
              active.header = { fullName: read("fullName"), email: read("email"), phone: read("phone"), location: read("location"),
                links: read("links").split("\n").filter((line) => line.trim()).map((line) => {
                  const divider = line.indexOf("|");
                  return divider < 0 ? { label: line.trim(), url: line.trim() } : { label: line.slice(0, divider).trim(), url: line.slice(divider + 1).trim() };
                }) };
            } else if (category.kind === "skills") {
              active.customSkillsSection = [...new Set([...(editing ? [] : active.customSkillsSection), ...read("skills").split(/[,\n]/).map((skill) => skill.trim()).filter(Boolean)])];
            } else {
              const content = [read("title"), read("organization"), [read("startDate"), read("endDate")].filter(Boolean).join(" – "), read("description"), ...extras].filter(Boolean).join("\n");
              const section = { id: category.id, title: isCustom ? read("sectionName") : category.label, content };
              active.additionalSections = [...(active.additionalSections ?? []).filter((s) => s.id !== category.id), section];
            }
          });
        }
        onClose();
      }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="add-entry-title" className="text-lg font-semibold">{block || editing || existing || category.kind === "contact" ? "Edit" : "Add"} {category.label}</h2>
          <button type="button" onClick={onClose} aria-label="Close form" className="rounded px-2 py-1 hover:bg-slate-100">✕</button>
        </div>
        <div className="space-y-4">
          {category.kind === "contact" ? <>
            {input("fullName", "Full name", preset.header.fullName, true)}
            {input("email", "Email", preset.header.email)}
            {input("phone", "Phone", preset.header.phone)}
            {input("location", "Location", preset.header.location)}
            <label className="block text-sm font-medium">Links (one per line: Label | URL)
              <textarea name="links" rows={3} defaultValue={preset.header.links.map((link) => `${link.label} | ${link.url}`).join("\n")} className={fieldClass} />
            </label>
          </> : category.kind === "skills" ? (
            <label className="block text-sm font-medium">{editing ? "Skills and interests (separate with commas)" : "New skills or interests (separate with commas)"}
              <textarea name="skills" rows={4} defaultValue={editing ? preset.customSkillsSection.join(", ") : ""} className={fieldClass} placeholder="Python, public speaking, photography" />
            </label>
          ) : <>
            {isCustom && input("sectionName", "Section name", existing?.title ?? "", true)}
            {!existing && input("title", category.id === "target-title" ? "Target job title" : category.id === "education" ? "Degree or qualification" : category.id === "experience" ? "Job title" : "Title", block?.title ?? "", category.id !== "summary")}
            {category.id !== "target-title" && category.id !== "summary" && !existing && <>
              {input("organization", category.id === "education" ? "School or university" : "Company or organization", block?.organization ?? "")}
              <div className="grid grid-cols-2 gap-3">{input("startDate", "Start date (e.g. May 2024)", block?.startDate ?? "")}{input("endDate", "End date (or Present)", block?.endDate ?? "")}</div>
              {category.kind === "blocks" && input("location", "Location (optional)", block?.location ?? "")}
            </>}
            <label className="block text-sm font-medium">{category.id === "target-title" ? "Additional details (optional)" : "Description (separated by line)"}
              <textarea name="description" rows={5} required={category.id !== "target-title"} defaultValue={block?.bullets.join("\n") ?? existing?.content ?? ""} className={fieldClass} />
            </label>
            {category.kind === "blocks" && <>
              {input("tags", "Skills / tags (comma-separated)", block?.tags.join(", ") ?? "")}
              <label className="block text-sm font-medium">Extra source notes (optional)
                <textarea name="notes" rows={3} defaultValue={block?.sourceContext ?? ""} className={fieldClass} placeholder="More details and metrics to support future rewrites" />
              </label>
            </>}
            {extraFields.map((id) => <div key={id} className="flex items-end gap-2">
              <div className="flex-1">{input(`extra-label-${id}`, "Extra field name", "", true)}</div>
              <div className="flex-1">{input(`extra-value-${id}`, "Details", "", true)}</div>
              <button type="button" aria-label="Remove extra field" onClick={() => setExtraFields((fields) => fields.filter((field) => field !== id))} className="p-2">✕</button>
            </div>)}
            <button type="button" className="text-sm font-medium text-sky-700" onClick={() => setExtraFields((fields) => [...fields, (fields.at(-1) ?? 0) + 1])}>+ Add another field</button>
          </>}
          <p className="text-xs text-slate-500">{category.kind === "blocks" ? (block ? "Editing this shared vault entry updates every resume that uses it. Changing description bullets clears its tailored rewrites in all versions." : "Saved to your vault. Choose Add to Resume on the new card when you're ready.") : "Saved to your current resume version."}</p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">Save</button>
        </div>
      </form>
    </dialog>
  );
}
