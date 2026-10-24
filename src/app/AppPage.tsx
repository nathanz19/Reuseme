"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useCallback, useEffect, useMemo, useState } from "react";
import { canApplyHeaderAndSkills, canInsertBlockOnResume } from "@/lib/lineCount";
import { AppShell } from "@/components/AppShell";
import { JDPanel } from "@/components/JDPanel";
import { Navbar } from "@/components/Navbar";
import { ResumeCanvas } from "@/components/ResumeCanvas";
import { TailorDialog } from "@/components/TailorDialog";
import { VaultCategoryList } from "@/components/VaultCategoryList";
import { VaultToolbar } from "@/components/VaultToolbar";
import { DEMO_JD_TEXT } from "@/data/demo-jd";
import { matchVault, tailorBullet } from "@/data/fixtures";
import { computeCoverage } from "@/lib/coverage";
import { getEffectiveBullets } from "@/lib/getEffectiveBullets";
import { collectAllTags, searchBlocks } from "@/lib/search";
import {
  type DragItemData,
  RESUME_DROP_ID,
  VAULT_DROP_ID,
  parseSectionDroppableId,
  parseVaultDraggableId,
  resumeDropCollision,
  DND_CONTEXT_ID,
} from "@/lib/dnd";
import { FORGOTTEN_THRESHOLD } from "@/lib/tunables";
import type { AccomplishmentBlock, BlockCategory } from "@/types/resume";
import { useResumeStore } from "@/store/resumeStore";
import { useSessionStore } from "@/store/sessionStore";

function highlightedVaultSection(
  activeDrag: DragItemData | null,
  overId: string | null,
  vaultBlocks: AccomplishmentBlock[],
): BlockCategory | null {
  if (!activeDrag || activeDrag.origin !== "vault" || !overId) return null;
  const dragged = vaultBlocks.find((b) => b.id === activeDrag.blockId);
  if (!dragged) return null;
  if (overId === RESUME_DROP_ID) return dragged.category;
  const sectionCat = parseSectionDroppableId(overId);
  if (sectionCat === dragged.category) return sectionCat;
  const overBlock = vaultBlocks.find((b) => b.id === overId);
  if (overBlock && overBlock.category === dragged.category) {
    return dragged.category;
  }
  return null;
}

export function AppPage() {
  const vaultBlocks = useResumeStore((s) => s.vaultBlocks);
  const presets = useResumeStore((s) => s.presets);
  const activePresetId = useResumeStore((s) => s.activePresetId);
  const past = useResumeStore((s) => s.past);
  const future = useResumeStore((s) => s.future);
  const hasHydrated = useResumeStore((s) => s._hasHydrated);
  const rehydrate = useResumeStore((s) => s.rehydrate);
  const commit = useResumeStore((s) => s.commit);
  const undo = useResumeStore((s) => s.undo);
  const redo = useResumeStore((s) => s.redo);
  const addBlockToResume = useResumeStore((s) => s.addBlockToResume);
  const removeBlockFromResume = useResumeStore((s) => s.removeBlockFromResume);
  const reorderInSection = useResumeStore((s) => s.reorderInSection);
  const insertBlockOnResume = useResumeStore((s) => s.insertBlockOnResume);
  const setTemplate = useResumeStore((s) => s.setTemplate);
  const switchPreset = useResumeStore((s) => s.switchPreset);
  const duplicatePreset = useResumeStore((s) => s.duplicatePreset);
  const acceptTailorOverride = useResumeStore((s) => s.acceptTailorOverride);

  const searchQuery = useSessionStore((s) => s.searchQuery);
  const selectedTags = useSessionStore((s) => s.selectedTags);
  const includeArchived = useSessionStore((s) => s.includeArchived);
  const leftTab = useSessionStore((s) => s.leftTab);
  const mobilePane = useSessionStore((s) => s.mobilePane);
  const jdText = useSessionStore((s) => s.jdText);
  const parsedJD = useSessionStore((s) => s.parsedJD);
  const rankings = useSessionStore((s) => s.rankings);
  const lastMatchError = useSessionStore((s) => s.lastMatchError);
  const tailorDialog = useSessionStore((s) => s.tailorDialog);
  const tailorProposal = useSessionStore((s) => s.tailorProposal);
  const tailorLoading = useSessionStore((s) => s.tailorLoading);

  const setSearchQuery = useSessionStore((s) => s.setSearchQuery);
  const toggleTag = useSessionStore((s) => s.toggleTag);
  const setIncludeArchived = useSessionStore((s) => s.setIncludeArchived);
  const setLeftTab = useSessionStore((s) => s.setLeftTab);
  const setMobilePane = useSessionStore((s) => s.setMobilePane);
  const setJdText = useSessionStore((s) => s.setJdText);
  const setMatchResult = useSessionStore((s) => s.setMatchResult);
  const setMatchError = useSessionStore((s) => s.setMatchError);
  const openTailorDialog = useSessionStore((s) => s.openTailorDialog);
  const closeTailorDialog = useSessionStore((s) => s.closeTailorDialog);
  const setTailorProposal = useSessionStore((s) => s.setTailorProposal);
  const setTailorLoading = useSessionStore((s) => s.setTailorLoading);
  const setTailorTone = useSessionStore((s) => s.setTailorTone);

  useEffect(() => {
    void rehydrate();
  }, [rehydrate]);

  useEffect(() => {
    if (!jdText) {
      setJdText(DEMO_JD_TEXT);
    }
  }, [jdText, setJdText]);

  const activePreset = useMemo(
    () => presets.find((p) => p.id === activePresetId) ?? presets[0],
    [presets, activePresetId],
  );

  const allTags = useMemo(() => collectAllTags(vaultBlocks), [vaultBlocks]);

  const filteredBlocks = useMemo(
    () =>
      searchBlocks(vaultBlocks, {
        query: searchQuery,
        selectedTags,
        includeArchived,
      }),
    [vaultBlocks, searchQuery, selectedTags, includeArchived],
  );

  const coverage = useMemo(
    () => computeCoverage(parsedJD, vaultBlocks, activePreset),
    [parsedJD, vaultBlocks, activePreset],
  );

  const forgottenBlocks = useMemo(() => {
    if (!parsedJD) return [];
    return vaultBlocks.filter(
      (b) =>
        b.isArchived &&
        (rankings[b.id]?.matchScore ?? 0) >= FORGOTTEN_THRESHOLD,
    );
  }, [vaultBlocks, parsedJD, rankings]);

  const tailorBlock = tailorDialog
    ? vaultBlocks.find((b) => b.id === tailorDialog.blockId)
    : undefined;

  const [activeDrag, setActiveDrag] = useState<DragItemData | null>(null);
  const [spaceWarning, setSpaceWarning] = useState<string | null>(null);
  const [overTargetId, setOverTargetId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const vaultDragCategory = useMemo(() => {
    if (!activeDrag || activeDrag.origin !== "vault") return null;
    return vaultBlocks.find((b) => b.id === activeDrag.blockId)?.category ?? null;
  }, [activeDrag, vaultBlocks]);

  const highlightedSection = useMemo(
    () => highlightedVaultSection(activeDrag, overTargetId, vaultBlocks),
    [activeDrag, overTargetId, vaultBlocks],
  );

  const overlayBlock = useMemo(() => {
    if (!activeDrag) return undefined;
    return vaultBlocks.find((b) => b.id === activeDrag.blockId);
  }, [activeDrag, vaultBlocks]);

  const clearDragState = useCallback(() => {
    setActiveDrag(null);
    setOverTargetId(null);
  }, []);

  const flashSpaceWarning = useCallback(() => {
    setSpaceWarning(
      "That change would exceed the one-page line budget (45 estimated lines on US Letter).",
    );
    window.setTimeout(() => setSpaceWarning(null), 4500);
  }, []);

  const canAddBlock = useCallback(
    (blockId: string) =>
      canInsertBlockOnResume(activePreset, vaultBlocks, blockId, null),
    [activePreset, vaultBlocks],
  );

  const tryAddBlock = useCallback(
    (blockId: string) => {
      const ok = addBlockToResume(blockId);
      if (!ok) flashSpaceWarning();
      return ok;
    },
    [addBlockToResume, flashSpaceWarning],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragItemData | undefined;
    if (data) setActiveDrag(data);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverTargetId(event.over ? String(event.over.id) : null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const activeData = active.data.current as DragItemData | undefined;
      clearDragState();

      if (!over || active.id === over.id || !activeData) return;

      const overId = String(over.id);

      if (activeData.origin === "vault") {
        const isResumeTarget =
          overId === RESUME_DROP_ID ||
          parseSectionDroppableId(overId) !== null ||
          vaultBlocks.some((b) => b.id === overId);
        if (!isResumeTarget) return;

        const beforeBlockId = vaultBlocks.some((b) => b.id === overId)
          ? overId
          : null;
        const ok = insertBlockOnResume(activeData.blockId, beforeBlockId);
        if (!ok) flashSpaceWarning();
        return;
      }

      if (activeData.origin === "canvas") {
        if (overId === VAULT_DROP_ID || parseVaultDraggableId(overId)) {
          removeBlockFromResume(activeData.blockId);
          return;
        }
        const overBlock = vaultBlocks.find((b) => b.id === overId);
        if (
          overBlock &&
          activeData.category &&
          activeData.category === overBlock.category
        ) {
          reorderInSection(activeData.category, activeData.blockId, overId);
        }
      }
    },
    [
      clearDragState,
      insertBlockOnResume,
      removeBlockFromResume,
      reorderInSection,
      vaultBlocks,
      flashSpaceWarning,
    ],
  );

  const runAnalyze = useCallback(() => {
    const result = matchVault(jdText, vaultBlocks);
    if ("error" in result) {
      setMatchError(result.error);
      return;
    }
    setMatchResult(result.parsedJD, result.rankings);
  }, [jdText, vaultBlocks, setMatchError, setMatchResult]);

  const startTailor = useCallback(
    async (blockId: string, bulletIndex: number) => {
      const block = vaultBlocks.find((b) => b.id === blockId);
      if (!block || !parsedJD) return;
      openTailorDialog(blockId, bulletIndex);
      setTailorProposal(null);
      setTailorLoading(true);
      const bulletText = getEffectiveBullets(block, activePreset)[bulletIndex];
      try {
        const proposal = await tailorBullet({
          block,
          bulletIndex,
          bulletText,
          parsedJD,
          presetId: activePreset.id,
        });
        setTailorProposal(proposal);
      } finally {
        setTailorLoading(false);
      }
    },
    [
      vaultBlocks,
      parsedJD,
      activePreset,
      openTailorDialog,
      setTailorProposal,
      setTailorLoading,
    ],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.key === "z") {
        e.preventDefault();
        undo();
      } else if (e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  const leftPane = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 border-b border-slate-200 text-sm">
        <button
          type="button"
          className={`flex-1 px-3 py-2 ${
            leftTab === "vault" ? "border-b-2 border-slate-900 font-medium" : ""
          }`}
          onClick={() => setLeftTab("vault")}
        >
          Vault
        </button>
        <button
          type="button"
          className={`flex-1 px-3 py-2 ${
            leftTab === "jd" ? "border-b-2 border-slate-900 font-medium" : ""
          }`}
          onClick={() => setLeftTab("jd")}
        >
          Job Description
        </button>
      </div>
      {leftTab === "vault" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <VaultToolbar
            searchQuery={searchQuery}
            allTags={allTags}
            selectedTags={selectedTags}
            includeArchived={includeArchived}
            onSearchChange={setSearchQuery}
            onToggleTag={toggleTag}
            onIncludeArchivedChange={setIncludeArchived}
          />
          <VaultCategoryList
            blocks={filteredBlocks}
            header={activePreset.header}
            skills={activePreset.customSkillsSection}
            searchQuery={searchQuery}
            selectedTags={selectedTags}
            activeBlockIds={activePreset.activeBlockIds}
            rankings={rankings}
            canAddBlock={canAddBlock}
            onAdd={tryAddBlock}
            onTailorBullet={(blockId, index) => void startTailor(blockId, index)}
          />
        </div>
      ) : (
        <JDPanel
          jdText={jdText}
          lastMatchError={lastMatchError}
          parsedJD={parsedJD}
          coverage={coverage}
          forgottenBlocks={forgottenBlocks}
          rankings={rankings}
          activeBlockIds={activePreset.activeBlockIds}
          onJdTextChange={setJdText}
          onAnalyze={runAnalyze}
          canAddBlock={canAddBlock}
          onAddBlock={tryAddBlock}
        />
      )}
    </div>
  );

  const canvas = hasHydrated ? (
    <ResumeCanvas
      preset={activePreset}
      vaultBlocks={vaultBlocks}
      rankings={rankings}
      vaultDragCategory={vaultDragCategory}
      highlightedSection={highlightedSection}
      onRemove={removeBlockFromResume}
      onHeaderSave={(header, skills) => {
        if (
          !canApplyHeaderAndSkills(
            activePreset,
            vaultBlocks,
            header,
            skills,
          )
        ) {
          flashSpaceWarning();
          return;
        }
        commit((draft) => {
          const preset = draft.presets.find((p) => p.id === draft.activePresetId);
          if (!preset) return;
          preset.header = header;
          preset.customSkillsSection = skills;
        });
      }}
      onTailorBullet={(blockId, index) => void startTailor(blockId, index)}
    />
  ) : (
    <p className="text-sm text-slate-500">Loading resume…</p>
  );

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      {spaceWarning && (
        <p
          className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-center text-xs text-amber-950"
          role="status"
        >
          {spaceWarning}
        </p>
      )}
      <DndContext
        id={DND_CONTEXT_ID}
        sensors={sensors}
        collisionDetection={resumeDropCollision}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={clearDragState}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AppShell
          navbar={
            <Navbar
              presets={presets}
              activePresetId={activePresetId}
              templateId={activePreset.templateId}
              vaultBlocks={vaultBlocks}
              activePreset={activePreset}
              canUndo={past.length > 0}
              canRedo={future.length > 0}
              onPresetChange={switchPreset}
              onNewVersion={duplicatePreset}
              onUndo={undo}
              onRedo={redo}
              onTemplateChange={setTemplate}
              onExportPdf={() => window.print()}
            />
          }
          leftPane={leftPane}
          canvas={canvas}
          mobilePane={mobilePane}
          onMobilePaneChange={setMobilePane}
          vaultDropActive={activeDrag?.origin === "canvas"}
        />
        </div>
        <DragOverlay>
          {overlayBlock ? (
            <div className="rounded border border-slate-400 bg-white p-2 text-sm shadow-lg">
              {overlayBlock.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {tailorBlock && (tailorProposal || tailorLoading) && (
        <TailorDialog
          block={tailorBlock}
          proposal={tailorProposal}
          loading={tailorLoading}
          onToneChange={setTailorTone}
          onAccept={() => {
            if (!tailorProposal || !tailorDialog) return;
            const text =
              tailorProposal.variants[tailorProposal.selectedTone];
            const ok = acceptTailorOverride(
              tailorDialog.blockId,
              tailorDialog.bulletIndex,
              text,
            );
            if (!ok) {
              flashSpaceWarning();
              return;
            }
            closeTailorDialog();
          }}
          onReject={closeTailorDialog}
        />
      )}
    </div>
  );
}
