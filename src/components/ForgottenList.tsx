"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { vaultDraggableId } from "@/lib/dnd";
import type { AccomplishmentBlock, SemanticRanking } from "@/types/resume";

interface ForgottenListProps {
  blocks: AccomplishmentBlock[];
  rankings: Record<string, SemanticRanking>;
  activeBlockIds: string[];
  canAddBlock: (blockId: string) => boolean;
  onAdd: (blockId: string) => void;
}

function ForgottenRow({
  block,
  ranking,
  onResume,
  canAdd,
  onAdd,
}: {
  block: AccomplishmentBlock;
  ranking?: SemanticRanking;
  onResume: boolean;
  canAdd: boolean;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: vaultDraggableId(block.id),
    data: { origin: "vault", blockId: block.id },
    disabled: onResume || !canAdd,
  });

  return (
    <li
      ref={setNodeRef}
      className={`flex items-start gap-2 rounded border border-amber-200 bg-amber-50/50 p-2 text-xs ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        className="mt-0.5 shrink-0 cursor-grab text-slate-400 disabled:cursor-default disabled:opacity-30"
        disabled={onResume || !canAdd}
        aria-label="Drag to resume"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">
          {block.title} · {block.organization}
        </p>
        {ranking && (
          <p className="text-slate-600">
            Score {ranking.matchScore} — {ranking.matchExplanation}
          </p>
        )}
      </div>
      <button
        type="button"
        disabled={onResume || !canAdd}
        onClick={onAdd}
        className="shrink-0 rounded border border-slate-300 bg-white px-2 py-1 disabled:opacity-50"
      >
        {onResume ? "On resume" : canAdd ? "Add to Resume" : "Cannot Fit"}
      </button>
    </li>
  );
}

export function ForgottenList({
  blocks,
  rankings,
  activeBlockIds,
  canAddBlock,
  onAdd,
}: ForgottenListProps) {
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Forgotten experience
      </h3>
      <ul className="space-y-2">
        {blocks.map((block) => (
          <ForgottenRow
            key={block.id}
            block={block}
            ranking={rankings[block.id]}
            onResume={activeBlockIds.includes(block.id)}
            canAdd={canAddBlock(block.id)}
            onAdd={() => onAdd(block.id)}
          />
        ))}
      </ul>
    </div>
  );
}
