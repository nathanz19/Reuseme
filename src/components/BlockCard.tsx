"use client";

import { BlockActions } from "@/components/BlockActions";
import { IconAction } from "@/components/IconAction";
import { useDraggable } from "@dnd-kit/core";
import { ChevronDown, ChevronRight, GripVertical, RefreshCw } from "lucide-react";
import { useState } from "react";
import { vaultDraggableId } from "@/lib/dnd";
import type { AccomplishmentBlock, SemanticRanking } from "@/types/resume";

interface BlockCardProps {
  block: AccomplishmentBlock;
  onResume: boolean;
  canAdd: boolean;
  ranking?: SemanticRanking;
  onAdd: () => void;
  onTailorBullet: (bulletIndex: number) => void;
}

export function BlockCard({
  block,
  onResume,
  canAdd,
  ranking,
  onAdd,
  onTailorBullet,
}: BlockCardProps) {
  const [open, setOpen] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: vaultDraggableId(block.id),
    data: { origin: "vault", blockId: block.id, category: block.category },
    disabled: onResume,
  });

  return (
    <article
      ref={setNodeRef}
      className={`group relative rounded border border-slate-200 bg-white text-sm shadow-sm ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-2 p-3 pt-10">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab text-slate-400 disabled:cursor-default disabled:opacity-30"
          disabled={onResume}
          aria-label="Drag to resume"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <button
          type="button"
          className="mt-0.5 text-slate-500"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="font-semibold text-slate-900">{block.title}</h3>
            <span className="text-slate-500">{block.organization}</span>
            {block.isArchived && (
              <span className="rounded bg-slate-100 px-1.5 text-xs text-slate-600">
                Archived
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {block.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-slate-50 px-1.5 text-xs text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
          {ranking && (
            <p className="mt-2 text-xs text-slate-700">
              <span className="font-semibold">{ranking.matchScore}</span> —{" "}
              {ranking.matchExplanation}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={onResume || !canAdd}
          onClick={onAdd}
          title={
            !onResume && !canAdd
              ? "Adding this block would exceed the one-page line budget"
              : undefined
          }
          className="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
        >
          {onResume ? "On resume" : canAdd ? "Add to Resume" : "Cannot fit"}
        </button>
      </div>
      <div className="resume-hover-control absolute right-2 top-1 print:hidden"><BlockActions block={block} /></div>
      {open && (
        <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs">
          <p className="whitespace-pre-wrap text-slate-700">{block.sourceContext}</p>
          <ul className="mt-2 space-y-1">
            {block.bullets.map((bullet, index) => (
              <li key={index} className="flex items-start justify-between gap-2">
                <span className="text-slate-800">• {bullet}</span>
                <IconAction label="Tailor bullet" className="resume-hover-control print:hidden" onClick={() => onTailorBullet(index)}>
                  <RefreshCw size={14} aria-hidden="true" />
                </IconAction>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
