"use client";

import { useDraggable } from "@dnd-kit/core";
import { Check } from "lucide-react";
import { KEYBOARD_DRAG_FOCUS, KeyboardDragHandle } from "@/components/KeyboardDragHandle";
import { vaultDraggableId, wholeElementDragListeners } from "@/lib/dnd";
import { btnOutlineSm } from "@/lib/theme";
import { matchTier, requirementsForTag, type MatchTier } from "@/lib/relevance";
import { useSessionStore } from "@/store/sessionStore";
import type {
  AccomplishmentBlock,
  SemanticRanking,
  TagMatch,
} from "@/types/resume";

interface RankedVaultCardProps {
  rank: number;
  block: AccomplishmentBlock;
  ranking: SemanticRanking;
  /** Effective bullets (accepted rewrites applied). */
  bullets: string[];
  tagMatches: TagMatch[];
  onResume: boolean;
  canAdd: boolean;
  onAdd: () => void;
}

const TIER_STYLES: Record<
  MatchTier,
  { label: string; badge: string; bar: string }
> = {
  strong: {
    label: "STRONG",
    badge: "bg-accent-subtle text-accent-text",
    bar: "bg-accent",
  },
  partial: {
    label: "PARTIAL",
    badge: "bg-amber-100 text-amber-800",
    bar: "bg-amber-500",
  },
  weak: {
    label: "WEAK",
    badge: "bg-slate-200 text-slate-600",
    bar: "bg-slate-400",
  },
};

function dateRange(block: AccomplishmentBlock): string {
  return block.startDate === block.endDate
    ? block.startDate
    : `${block.startDate} – ${block.endDate}`;
}

export function RankedVaultCard({
  rank,
  block,
  ranking,
  bullets,
  tagMatches,
  onResume,
  canAdd,
  onAdd,
}: RankedVaultCardProps) {
  const arrange = useSessionStore((s) => s.dragMode === "arrange");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: vaultDraggableId(block.id),
    data: { origin: "vault", blockId: block.id, category: block.category },
    disabled: onResume || !arrange,
  });
  const dragListeners = wholeElementDragListeners(listeners);

  const tier = TIER_STYLES[matchTier(ranking)];
  const score = Math.min(Math.max(ranking.matchScore, 0), 100);
  const bullet = bullets[ranking.bestBulletIndex] ?? bullets[0];

  return (
    <article
      ref={setNodeRef}
      {...dragListeners}
      data-ranked-block-id={block.id}
      data-on-resume={onResume}
      className={`group relative rounded border border-slate-200 bg-white p-3 text-sm shadow-sm transition-opacity ${KEYBOARD_DRAG_FOCUS} ${
        dragListeners ? "cursor-grab select-none" : ""
      } ${onResume ? "opacity-50" : isDragging ? "opacity-60" : ""}`}
    >
      {dragListeners && (
        <KeyboardDragHandle label="Drag to resume" attributes={attributes} handleRef={setActivatorNodeRef} />
      )}
      <div className="flex items-start gap-2">
        <span
          aria-label={`Rank ${rank}`}
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-medium text-slate-600"
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-ink">{block.title}</h3>
          <p className="truncate text-xs text-slate-500">
            {block.organization} · {dateRange(block)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-2xl font-semibold leading-none text-slate-900">
            {ranking.matchScore}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${tier.badge}`}
          >
            {tier.label}
          </span>
        </div>
      </div>

      <div
        className="mt-2 h-1 overflow-hidden rounded bg-slate-100"
        role="presentation"
      >
        <div className={`h-full ${tier.bar}`} style={{ width: `${score}%` }} />
      </div>

      {bullet && <p className="mt-2 text-xs text-slate-700">{bullet}</p>}

      <div className="mt-2 flex items-end justify-between gap-2">
        <ul className="flex min-w-0 flex-wrap gap-1">
          {ranking.matchedTags.length === 0 ? (
            <li className="text-xs text-slate-500">No matching tags</li>
          ) : (
            ranking.matchedTags.map((tag) => {
              const requirements = requirementsForTag(tagMatches, tag);
              return (
                <li
                  key={tag}
                  title={
                    requirements.length > 0
                      ? `Matches: ${requirements.join(", ")}`
                      : undefined
                  }
                  className="inline-flex items-center gap-1 rounded-full bg-accent-subtle px-2 py-0.5 text-xs text-accent-text"
                >
                  <Check size={11} aria-hidden="true" />
                  {tag}
                </li>
              );
            })
          )}
        </ul>
        <div className="flex shrink-0 items-center gap-2">
          <div className="resume-hover-control print:hidden">
            <button
              type="button"
              disabled={onResume || !canAdd}
              onClick={onAdd}
              title={
                !onResume && !canAdd
                  ? "Adding this block would exceed the one-page line budget"
                  : undefined
              }
              className={btnOutlineSm}
            >
              {canAdd || onResume ? "Add to Resume" : "Cannot fit"}
            </button>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-slate-600">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                onResume ? "bg-slate-800" : "border border-slate-400"
              }`}
            />
            {onResume ? "On resume" : "Not on resume"}
          </span>
        </div>
      </div>
    </article>
  );
}
