"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { AddEntryDialog } from "@/components/AddEntryDialog";
import { IconAction } from "@/components/IconAction";
import type { VaultCategory } from "@/lib/vaultCategories";
import { useResumeStore } from "@/store/resumeStore";

export function SectionActions({ category }: { category: VaultCategory }) {
  const [editing, setEditing] = useState(false);
  const commit = useResumeStore((state) => state.commit);
  return (
    <div className="inline-flex items-center gap-1 print:hidden">
      <IconAction label={`Edit ${category.label}`} onClick={() => setEditing(true)}><Pencil size={15} aria-hidden="true" /></IconAction>
      <IconAction label={`${category.kind === "placeholder" ? "Delete" : "Clear"} ${category.label}`} danger onClick={() => commit((draft) => {
        const preset = draft.presets.find((entry) => entry.id === draft.activePresetId);
        if (!preset) return;
        if (category.kind === "contact") {
          preset.header = { fullName: "", email: "", phone: "", location: "", links: [] };
        } else if (category.kind === "skills") {
          preset.customSkillsSection = [];
        } else {
          preset.additionalSections = (preset.additionalSections ?? []).filter((section) => section.id !== category.id);
        }
      })}><Trash2 size={15} aria-hidden="true" /></IconAction>
      {editing && <AddEntryDialog category={category} editing onClose={() => setEditing(false)} />}
    </div>
  );
}
