"use client";

import { ArrowDown } from "lucide-react";
import type { AddCost } from "@/components/AddCostBadge";
import { RankedVaultCard } from "@/components/RankedVaultCard";
import { getEffectiveBullets } from "@/lib/getEffectiveBullets";
import type {
  AccomplishmentBlock,
  ResumePreset,
  SemanticRanking,
  TagMatch,
} from "@/types/resume";

export interface RankedEntry {
  block: AccomplishmentBlock;
  ranking: SemanticRanking;
}

interface RankedVaultListProps {
  ranked: RankedEntry[];
  preset: ResumePreset;
  tagMatches: TagMatch[];
  canAddBlock: (blockId: string) => boolean;
  addCost: (blockId: string) => AddCost | null;
  onAdd: (blockId: string) => void;
}

export function RankedVaultList({
  ranked,
  preset,
  tagMatches,
  canAddBlock,
  addCost,
  onAdd,
}: RankedVaultListProps) {
  if (ranked.length === 0) return null;

  return (
    <section
      aria-label="Ranked vault"
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex shrink-0 items-center justify-between px-3 py-2 text-[11px]">
        <h3 className="font-semibold uppercase tracking-wide text-slate-500">
          Ranked vault
        </h3>
        <span className="inline-flex items-center gap-1 text-slate-500">
          <ArrowDown size={12} aria-hidden="true" />
          Score, high to low
        </span>
      </div>
      <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {ranked.map(({ block, ranking }, index) => (
          <li key={block.id}>
            <RankedVaultCard
              rank={index + 1}
              block={block}
              ranking={ranking}
              bullets={getEffectiveBullets(block, preset)}
              tagMatches={tagMatches}
              onResume={preset.activeBlockIds.includes(block.id)}
              canAdd={canAddBlock(block.id)}
              addCost={addCost(block.id)}
              onAdd={() => onAdd(block.id)}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
