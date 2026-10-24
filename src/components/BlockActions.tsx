"use client";

import { Pencil, Trash2 } from "lucide-react";
import { IconAction } from "@/components/IconAction";
import { useState } from "react";
import { AddEntryDialog } from "@/components/AddEntryDialog";
import { VAULT_CATEGORIES } from "@/lib/vaultCategories";
import { useResumeStore } from "@/store/resumeStore";
import type { AccomplishmentBlock } from "@/types/resume";

export function BlockActions({ block, onRemove }: { block: AccomplishmentBlock; onRemove?: () => void }) {
  const [editing, setEditing] = useState(false);
  const deleteBlock = useResumeStore((state) => state.deleteVaultBlock);
  const category = VAULT_CATEGORIES.find((entry) => entry.blockCategory === block.category);

  return (
    <div className="inline-flex items-center gap-1 print:hidden">
      <IconAction label="Edit block" onClick={() => setEditing(true)}><Pencil size={15} aria-hidden="true" /></IconAction>
      <IconAction label={onRemove ? "Remove from resume" : "Delete block"} danger onClick={() => {
        if (onRemove) {
          onRemove();
        } else if (window.confirm(`Delete “${block.title}” from your vault and every resume version? This cannot be undone.`)) {
          deleteBlock(block.id);
        }
      }}><Trash2 size={15} aria-hidden="true" /></IconAction>
      {editing && category && <AddEntryDialog category={category} block={block} onClose={() => setEditing(false)} />}
    </div>
  );
}
