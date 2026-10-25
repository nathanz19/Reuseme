"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  canInsertBlockOnResume,
  measureCanvasInsertion,
} from "@/lib/lineCount";
import { usePageMeasurerVersion } from "@/lib/pageFit";
import { pageGeometry } from "@/lib/pageGeometry";
import { registerPageMeasurer } from "@/lib/pageMeasurer";
import { AppShell } from "@/components/AppShell";
import { CanvasBlockOverlay } from "@/components/CanvasBlock";
import { JDPanel } from "@/components/JDPanel";
import { Navbar } from "@/components/Navbar";
import { ResumeCanvas } from "@/components/ResumeCanvas";
import {
  SectionOverlay,
  snapshotSection,
  type SectionSnapshot,
} from "@/components/SortableSection";
import { TailorDialog } from "@/components/TailorDialog";
import { VaultCategoryList } from "@/components/VaultCategoryList";
import { VaultToolbar } from "@/components/VaultToolbar";
import { computeCoverage } from "@/lib/coverage";
import { tabActive } from "@/lib/theme";
import { resumeDropAnimation } from "@/lib/dropAnimation";
import { CANVAS_BLOCK_TRANSITION } from "@/lib/sortableLayout";
import { TailorResponseSchema } from "@/schemas/tailor";
import { getEffectiveBullets } from "@/lib/getEffectiveBullets";
import { prepareResumePrint, clearResumePrint } from "@/lib/printResume";
import { collectAllTags, searchBlocks } from "@/lib/search";
import {
  type CanvasPlaceholder,
  type DragItemData,
  PLACEHOLDER_FADE_OUT_MS,
  RESUME_DROP_ID,
  VAULT_DROP_ID,
  dragPointerY,
  insertionBeforeBlockId,
  isResumeDropTarget,
  isSectionDragData,
  parsePlaceholderId,
  parseSectionDroppableId,
  parseSectionSortableId,
  parseVaultDraggableId,
  placeholderId,
  resumeDropCollision,
  resumeKeyboardCoordinates,
  DND_CONTEXT_ID,
} from "@/lib/dnd";
import { RELEVANT_TOP_N } from "@/lib/tunables";
import { requestJdMatch } from "@/lib/jdMatchClient";
import { notifyAiUsageChanged } from "@/lib/aiUsage";
import { selectRankedCards } from "@/lib/relevance";
import type {
  AccomplishmentBlock,
  BlockCategory,
} from "@/types/resume";
import { useResumeStore } from "@/store/resumeStore";
import { useSessionStore } from "@/store/sessionStore";

function spaceLimitMessage(maxLines: number) {
  return `That change would exceed the one-page line budget (${maxLines} lines on US Letter).`;
}

function placeholdersEqual(
  a: CanvasPlaceholder | null,
  b: CanvasPlaceholder | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.blockId === b.blockId &&
    a.category === b.category &&
    a.beforeBlockId === b.beforeBlockId &&
    Boolean(a.leaving) === Boolean(b.leaving)
  );
}

function readBlockRects(ids: readonly string[]) {
  const rects: { id: string; top: number; height: number }[] = [];
  for (const id of ids) {
    const el = document.querySelector(
      `[data-canvas-block-id="${CSS.escape(id)}"]`,
    );
    if (!(el instanceof HTMLElement)) continue;
    const rect = el.getBoundingClientRect();
    rects.push({ id, top: rect.top, height: rect.height });
  }
  return rects;
}

/** Content width of a block on the resume page, or undefined when the canvas is hidden. */
function canvasBlockWidth(page: HTMLElement | null): number | undefined {
  if (!page) return undefined;
  const style = getComputedStyle(page);
  const width =
    page.clientWidth -
    parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight);
  return width > 0 ? width : undefined;
}

function highlightedVaultSection(
  activeDrag: DragItemData | null,
  overId: string | null,
  vaultBlocks: AccomplishmentBlock[],
): BlockCategory | null {
  if (!activeDrag || activeDrag.origin !== "vault" || !overId) return null;
  const dragged = vaultBlocks.find((b) => b.id === activeDrag.blockId);
  if (!dragged) return null;
  if (overId === RESUME_DROP_ID || parsePlaceholderId(overId)) {
    return dragged.category;
  }
  const sectionCat = parseSectionDroppableId(overId);
  if (sectionCat === dragged.category) return sectionCat;
  const overBlock = vaultBlocks.find((b) => b.id === overId);
  if (overBlock && overBlock.category === dragged.category) {
    return dragged.category;
  }
  return null;
}

export function AppPage() {
  // The offscreen measurer lets every budget check use the real rendered height.
  useEffect(() => registerPageMeasurer(), []);

  useEffect(() => {
    window.addEventListener("beforeprint", prepareResumePrint);
    window.addEventListener("afterprint", clearResumePrint);
    return () => {
      window.removeEventListener("beforeprint", prepareResumePrint);
      window.removeEventListener("afterprint", clearResumePrint);
      clearResumePrint();
    };
  }, []);

  const vaultBlocks = useResumeStore((s) => s.vaultBlocks);
  const presets = useResumeStore((s) => s.presets);
  const activePresetId = useResumeStore((s) => s.activePresetId);
  const past = useResumeStore((s) => s.past);
  const future = useResumeStore((s) => s.future);
  const hasHydrated = useResumeStore((s) => s._hasHydrated);
  const rehydrate = useResumeStore((s) => s.rehydrate);
  const undo = useResumeStore((s) => s.undo);
  const redo = useResumeStore((s) => s.redo);
  const addBlockToResume = useResumeStore((s) => s.addBlockToResume);
  const removeBlockFromResume = useResumeStore((s) => s.removeBlockFromResume);
  const reorderInSection = useResumeStore((s) => s.reorderInSection);
  const reorderSections = useResumeStore((s) => s.reorderSections);
  const insertBlockOnResume = useResumeStore((s) => s.insertBlockOnResume);
  const setTemplate = useResumeStore((s) => s.setTemplate);
  const switchPreset = useResumeStore((s) => s.switchPreset);
  const reorderDocuments = useResumeStore((s) => s.reorderDocuments);
  const renameDocument = useResumeStore((s) => s.renameDocument);
  const closeDocument = useResumeStore((s) => s.closeDocument);
  const createDocument = useResumeStore((s) => s.createDocument);
  const acceptTailorOverride = useResumeStore((s) => s.acceptTailorOverride);

  const searchQuery = useSessionStore((s) => s.searchQuery);
  const selectedSections = useSessionStore((s) => s.selectedSections);
  const dateFrom = useSessionStore((s) => s.dateFrom);
  const dateTo = useSessionStore((s) => s.dateTo);
  const selectedTags = useSessionStore((s) => s.selectedTags);
  const includeArchived = useSessionStore((s) => s.includeArchived);
  const leftTab = useSessionStore((s) => s.leftTab);
  const mobilePane = useSessionStore((s) => s.mobilePane);
  const jdText = useSessionStore((s) => s.jdText);
  const parsedJD = useSessionStore((s) => s.parsedJD);
  const rankings = useSessionStore((s) => s.rankings);
  const rankingsList = useSessionStore((s) => s.rankingsList);
  const tagMatches = useSessionStore((s) => s.tagMatches);
  const matchLoading = useSessionStore((s) => s.matchLoading);
  const lastMatchError = useSessionStore((s) => s.lastMatchError);
  const tailorDialog = useSessionStore((s) => s.tailorDialog);
  const tailorProposal = useSessionStore((s) => s.tailorProposal);
  const tailorLoading = useSessionStore((s) => s.tailorLoading);
  const dragMode = useSessionStore((s) => s.dragMode);
  const setDragMode = useSessionStore((s) => s.setDragMode);

  const setSearchQuery = useSessionStore((s) => s.setSearchQuery);
  const toggleTag = useSessionStore((s) => s.toggleTag);
  const setIncludeArchived = useSessionStore((s) => s.setIncludeArchived);
  const setLeftTab = useSessionStore((s) => s.setLeftTab);
  const setMobilePane = useSessionStore((s) => s.setMobilePane);
  const setJdText = useSessionStore((s) => s.setJdText);
  const setMatchResult = useSessionStore((s) => s.setMatchResult);
  const setMatchError = useSessionStore((s) => s.setMatchError);
  const clearMatchError = useSessionStore((s) => s.clearMatchError);
  const setMatchLoading = useSessionStore((s) => s.setMatchLoading);
  const openTailorDialog = useSessionStore((s) => s.openTailorDialog);
  const closeTailorDialog = useSessionStore((s) => s.closeTailorDialog);
  const setTailorProposal = useSessionStore((s) => s.setTailorProposal);
  const setTailorLoading = useSessionStore((s) => s.setTailorLoading);
  const setTailorTone = useSessionStore((s) => s.setTailorTone);

  useEffect(() => {
    void rehydrate();
  }, [rehydrate]);

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
        selectedSections,
        dateFrom,
        dateTo,
        includeArchived,
      }),
    [vaultBlocks, searchQuery, selectedTags, selectedSections, dateFrom, dateTo, includeArchived],
  );

  const coverage = useMemo(
    () => computeCoverage(parsedJD, vaultBlocks, activePreset),
    [parsedJD, vaultBlocks, activePreset],
  );

  const rankedCards = useMemo(
    () => selectRankedCards(rankingsList, vaultBlocks, RELEVANT_TOP_N),
    [rankingsList, vaultBlocks],
  );

  const tailorBlock = tailorDialog
    ? vaultBlocks.find((b) => b.id === tailorDialog.blockId)
    : undefined;
  const [tailorConfirmation, setTailorConfirmation] = useState<{
    blockId: string;
    bulletIndex: number;
  } | null>(null);
  const tailorConfirmationBlock = tailorConfirmation
    ? vaultBlocks.find((b) => b.id === tailorConfirmation.blockId)
    : undefined;

  const [activeDrag, setActiveDrag] = useState<DragItemData | null>(null);
  const [activeSection, setActiveSection] = useState<SectionSnapshot | null>(null);
  const [spaceWarning, setSpaceWarning] = useState<string | null>(null);
  const [overTargetId, setOverTargetId] = useState<string | null>(null);
  const [placeholder, setPlaceholder] = useState<CanvasPlaceholder | null>(null);
  const [dropBlocked, setDropBlocked] = useState(false);
  const [overlayWidth, setOverlayWidth] = useState<number | undefined>();
  const placeholderRef = useRef<CanvasPlaceholder | null>(null);
  const dropBlockedRef = useRef(false);
  const dragLayoutRef = useRef<{
    top: number;
    blocks: ReturnType<typeof readBlockRects>;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: resumeKeyboardCoordinates,
    }),
  );

  const vaultDragCategory = useMemo(() => {
    if (!activeDrag || activeDrag.origin !== "vault") return null;
    return vaultBlocks.find((b) => b.id === activeDrag.blockId)?.category ?? null;
  }, [activeDrag, vaultBlocks]);

  // Set on drop over the vault; the block stays hidden in place while the
  // overlay fades, then is removed so siblings glide up.
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const removingBlockId =
    pendingRemovalId ??
    (activeDrag?.origin === "canvas" &&
    overTargetId &&
    (overTargetId === VAULT_DROP_ID || parseVaultDraggableId(overTargetId))
      ? activeDrag.blockId
      : null);

  // Measured when the drag starts (an event handler). The offscreen measurer
  // renders synchronously and cannot run during this component's render.
  const [vaultDropFits, setVaultDropFits] = useState(false);
  const vaultDropTarget = vaultDropFits && vaultDragCategory ? vaultDragCategory : null;

  const highlightedSection = useMemo(
    () => highlightedVaultSection(activeDrag, overTargetId, vaultBlocks),
    [activeDrag, overTargetId, vaultBlocks],
  );

  const overlayBlock = useMemo(() => {
    if (!activeDrag) return undefined;
    return vaultBlocks.find((b) => b.id === activeDrag.blockId);
  }, [activeDrag, vaultBlocks]);

  const fadeOutTimerRef = useRef<number | null>(null);

  const assignPlaceholder = useCallback((next: CanvasPlaceholder | null) => {
    if (fadeOutTimerRef.current !== null) {
      window.clearTimeout(fadeOutTimerRef.current);
      fadeOutTimerRef.current = null;
    }
    placeholderRef.current = next;
    setPlaceholder((prev) => (placeholdersEqual(prev, next) ? prev : next));
  }, []);

  /** Fade the vault skeleton out in place before removing it from the section. */
  const dismissPlaceholder = useCallback(() => {
    const current = placeholderRef.current;
    if (!current || current.leaving) return;
    assignPlaceholder({ ...current, leaving: true });
    fadeOutTimerRef.current = window.setTimeout(() => {
      fadeOutTimerRef.current = null;
      if (placeholderRef.current?.leaving) assignPlaceholder(null);
    }, PLACEHOLDER_FADE_OUT_MS);
  }, [assignPlaceholder]);

  useEffect(
    () => () => {
      if (fadeOutTimerRef.current !== null) window.clearTimeout(fadeOutTimerRef.current);
    },
    [],
  );

  const assignDropBlocked = useCallback((next: boolean) => {
    dropBlockedRef.current = next;
    setDropBlocked((prev) => (prev === next ? prev : next));
  }, []);

  // dnd-kit's drag delta folds in the vault list's scroll offset, so
  // activator + delta drifts from the real pointer once the vault is scrolled.
  const pointerYRef = useRef<number | null>(null);
  useEffect(() => {
    if (activeDrag?.origin !== "vault") return;
    const onPointerMove = (event: PointerEvent) => {
      pointerYRef.current = event.clientY;
    };
    document.addEventListener("pointermove", onPointerMove, true);
    return () => document.removeEventListener("pointermove", onPointerMove, true);
  }, [activeDrag?.origin]);

  const clearDragState = useCallback(() => {
    dragLayoutRef.current = null;
    pointerYRef.current = null;
    setActiveDrag(null);
    setActiveSection(null);
    setVaultDropFits(false);
    setOverTargetId(null);
    assignPlaceholder(null);
    assignDropBlocked(false);
  }, [assignPlaceholder, assignDropBlocked]);

  useEffect(() => {
    if (!dropBlocked) return;
    document.body.classList.add("resume-drop-blocked");
    return () => document.body.classList.remove("resume-drop-blocked");
  }, [dropBlocked]);

  const spaceMessage = spaceLimitMessage(pageGeometry(activePreset).maxLines);

  const flashSpaceWarning = useCallback(() => {
    setSpaceWarning(spaceMessage);
    window.setTimeout(() => setSpaceWarning(null), 4500);
  }, [spaceMessage]);

  // Whether each vault block fits is measured after render (an effect, on a
  // later task, because the measurer cannot run while React renders). Until
  // that result matches the current document, the formula answers.
  const measurerVersion = usePageMeasurerVersion();
  const [addable, setAddable] = useState<{
    preset: typeof activePreset;
    blocks: typeof vaultBlocks;
    fits: Map<string, boolean>;
  } | null>(null);
  useEffect(() => {
    if (measurerVersion === 0) return;
    const timer = window.setTimeout(() => {
      const fits = new Map<string, boolean>();
      for (const block of vaultBlocks) {
        fits.set(block.id, canInsertBlockOnResume(activePreset, vaultBlocks, block.id, null));
      }
      setAddable({ preset: activePreset, blocks: vaultBlocks, fits });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activePreset, vaultBlocks, measurerVersion]);

  const canAddBlock = useCallback(
    (blockId: string) => {
      if (addable?.preset === activePreset && addable.blocks === vaultBlocks) {
        const fits = addable.fits.get(blockId);
        if (fits !== undefined) return fits;
      }
      return canInsertBlockOnResume(activePreset, vaultBlocks, blockId, null, { estimate: true });
    },
    [addable, activePreset, vaultBlocks],
  );

  const tryAddBlock = useCallback(
    (blockId: string) => {
      const ok = addBlockToResume(blockId);
      if (!ok) flashSpaceWarning();
      return ok;
    },
    [addBlockToResume, flashSpaceWarning],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setSpaceWarning(null);
      assignPlaceholder(null);
      assignDropBlocked(false);
      const sectionData = event.active.data.current;
      if (isSectionDragData(sectionData)) {
        dragLayoutRef.current = null;
        setOverlayWidth(undefined);
        setActiveSection(
          snapshotSection(
            sectionData.sectionId,
            document.querySelector<HTMLElement>(
              `[data-resume-section="${CSS.escape(sectionData.sectionId)}"]`,
            ),
          ),
        );
        return;
      }
      const data = event.active.data.current as DragItemData | undefined;
      setVaultDropFits(
        data?.origin === "vault" &&
          canInsertBlockOnResume(activePreset, vaultBlocks, data.blockId),
      );
      const page = document.getElementById("resume-print-root");
      dragLayoutRef.current = data?.origin === "vault" && page ? {
        top: page.getBoundingClientRect().top,
        blocks: readBlockRects(activePreset.activeBlockIds),
      } : null;
      setOverlayWidth(
        data?.origin === "vault" ? canvasBlockWidth(page) : undefined,
      );
      if (data) setActiveDrag(data);
    },
    [assignPlaceholder, assignDropBlocked, activePreset, vaultBlocks],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const overId = event.over ? String(event.over.id) : null;
      setOverTargetId((prev) => (prev === overId ? prev : overId));

      const activeData = event.active.data.current as DragItemData | undefined;
      if (!activeData || activeData.origin !== "vault") {
        assignPlaceholder(null);
        assignDropBlocked(false);
        return;
      }

      const blockIds = vaultBlocks.map((block) => block.id);
      if (!isResumeDropTarget(overId, blockIds)) {
        dismissPlaceholder();
        assignDropBlocked(false);
        return;
      }

      const block = vaultBlocks.find((item) => item.id === activeData.blockId);
      if (!block) {
        assignPlaceholder(null);
        assignDropBlocked(false);
        return;
      }

      const height = measureCanvasInsertion(
        activePreset,
        vaultBlocks,
        block.id,
      );
      if (!height.fits) {
        assignPlaceholder(null);
        assignDropBlocked(true);
        return;
      }

      assignDropBlocked(false);
      const sectionIds = activePreset.activeBlockIds.filter((id) => {
        return (
          vaultBlocks.find((item) => item.id === id)?.category === block.category
        );
      });
      const pointerY = pointerYRef.current ?? dragPointerY(event);
      const layout = dragLayoutRef.current;
      const pageTop = document.getElementById("resume-print-root")?.getBoundingClientRect().top;
      const scrollOffset = layout && pageTop !== undefined ? pageTop - layout.top : 0;
      // Placeholder insertion and layout animation must not move the hit-test geometry.
      // Translate the initial geometry only when the resume scrolls.
      const stableRects = layout ? layout.blocks
        .filter((rect) => sectionIds.includes(rect.id))
        .map((rect) => ({ ...rect, top: rect.top + scrollOffset })) : readBlockRects(sectionIds);
      const beforeBlockId =
        pointerY == null
          ? overId && sectionIds.includes(overId)
            ? overId
            : null
          : insertionBeforeBlockId(pointerY, stableRects);

      assignPlaceholder({
        id: placeholderId(block.id),
        blockId: block.id,
        category: block.category,
        beforeBlockId,
      });
    },
    [activePreset, assignDropBlocked, assignPlaceholder, dismissPlaceholder, vaultBlocks],
  );

  // onDragOver only fires when the hovered droppable changes; the vault skeleton
  // also has to follow the pointer within one block or across the gaps. Entering
  // and leaving the canvas stay with onDragOver so moves never start a fade-out.
  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const data = event.active.data.current as DragItemData | undefined;
      if (data?.origin !== "vault" || !event.over) return;
      const blockIds = vaultBlocks.map((block) => block.id);
      if (isResumeDropTarget(String(event.over.id), blockIds)) handleDragOver(event);
    },
    [handleDragOver, vaultBlocks],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const pendingPlaceholder = placeholderRef.current;
      const blocked = dropBlockedRef.current;
      clearDragState();

      if (!over || active.id === over.id) return;

      const overId = String(over.id);

      const sectionData = active.data.current;
      if (isSectionDragData(sectionData)) {
        const overSectionId = parseSectionSortableId(overId);
        if (overSectionId) reorderSections(sectionData.sectionId, overSectionId);
        return;
      }

      const activeData = active.data.current as DragItemData | undefined;
      if (!activeData) return;

      if (activeData.origin === "vault") {
        const blockIds = vaultBlocks.map((block) => block.id);
        if (!isResumeDropTarget(overId, blockIds)) return;

        const beforeBlockId =
          pendingPlaceholder &&
          !pendingPlaceholder.leaving &&
          pendingPlaceholder.blockId === activeData.blockId
            ? pendingPlaceholder.beforeBlockId
            : null;
        const height = measureCanvasInsertion(
          activePreset,
          vaultBlocks,
          activeData.blockId,
          beforeBlockId,
        );
        if (blocked || !height.fits) {
          flashSpaceWarning();
          return;
        }
        const ok = insertBlockOnResume(activeData.blockId, beforeBlockId);
        if (!ok) flashSpaceWarning();
        return;
      }

      if (activeData.origin === "canvas") {
        if (overId === VAULT_DROP_ID || parseVaultDraggableId(overId)) {
          const blockId = activeData.blockId;
          setPendingRemovalId(blockId);
          // The collapse starts a frame after this; let it finish before removal.
          window.setTimeout(() => {
            removeBlockFromResume(blockId);
            setPendingRemovalId((current) => (current === blockId ? null : current));
          }, CANVAS_BLOCK_TRANSITION.duration + 50);
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
      reorderSections,
      vaultBlocks,
      flashSpaceWarning,
      activePreset,
    ],
  );

  const runAnalyze = useCallback(async () => {
    if (useSessionStore.getState().matchLoading) return;
    setMatchLoading(true);
    clearMatchError();
    try {
      const result = await requestJdMatch(jdText, vaultBlocks);
      if ("error" in result) {
        setMatchError(result.error);
        return;
      }
      setMatchResult(result.parsedJD, result.rankings, result.tagMatches);
    } finally {
      setMatchLoading(false);
    }
  }, [
    jdText,
    vaultBlocks,
    setMatchLoading,
    clearMatchError,
    setMatchError,
    setMatchResult,
  ]);

  const [tailorError, setTailorError] = useState<string | null>(null);
  const [mockTailoring, setMockTailoring] = useState(false);
  const tailorRequest = useRef<AbortController | null>(null);
  useEffect(() => () => tailorRequest.current?.abort(), []);

  const closeTailoring = useCallback(() => {
    tailorRequest.current?.abort();
    tailorRequest.current = null;
    setTailorError(null);
    closeTailorDialog();
  }, [closeTailorDialog]);

  const startTailor = useCallback(
    async (blockId: string, bulletIndex: number) => {
      const block = vaultBlocks.find((b) => b.id === blockId);
      if (!block) return;
      const bulletText = getEffectiveBullets(block, activePreset)[bulletIndex];
      if (bulletText === undefined) return;
      tailorRequest.current?.abort();
      const controller = new AbortController();
      tailorRequest.current = controller;
      openTailorDialog(blockId, bulletIndex);
      setTailorError(null);
      setTailorProposal(null);
      setTailorLoading(true);
      try {
        const response = await fetch("/api/blocks/tailor", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ block, bulletIndex, bulletText, jdText, parsedJD }),
          signal: controller.signal,
        });
        const data: unknown = await response.json();
        if (!response.ok) {
          const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "Could not generate rewrites. Please retry.";
          throw new Error(message);
        }
        const result = TailorResponseSchema.parse(data);
        if (controller.signal.aborted || tailorRequest.current !== controller) return;
        const current = useResumeStore.getState();
        const currentBlock = current.vaultBlocks.find((entry) => entry.id === blockId);
        if (current.activePresetId !== activePreset.id || !currentBlock || JSON.stringify(currentBlock) !== JSON.stringify(block) || getEffectiveBullets(currentBlock, current.getActivePreset())[bulletIndex] !== bulletText) {
          closeTailoring();
          return;
        }
        setMockTailoring(result.mock);
        setTailorProposal(result.proposal);
      } catch (error) {
        if (controller.signal.aborted || tailorRequest.current !== controller) return;
        setTailorError(error instanceof Error ? error.message : "Unable to connect. Please retry.");
      } finally {
        if (!controller.signal.aborted && tailorRequest.current === controller) setTailorLoading(false);
        notifyAiUsageChanged();
      }
    },
    [vaultBlocks, parsedJD, jdText, activePreset, openTailorDialog, setTailorProposal, setTailorLoading, closeTailoring],
  );

  const requestTailorConfirmation = useCallback(
    (blockId: string, bulletIndex: number) => {
      const block = vaultBlocks.find((b) => b.id === blockId);
      if (!block || getEffectiveBullets(block, activePreset)[bulletIndex] === undefined) return;
      setTailorConfirmation({ blockId, bulletIndex });
    },
    [activePreset, vaultBlocks],
  );

  const confirmTailor = useCallback(() => {
    if (!tailorConfirmation) return;
    const { blockId, bulletIndex } = tailorConfirmation;
    setTailorConfirmation(null);
    void startTailor(blockId, bulletIndex);
  }, [startTailor, tailorConfirmation]);

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
      <div className="vault-tabbar flex shrink-0 border-b border-border bg-surface text-sm">
        <button
          type="button"
          className={`flex-1 px-3 py-2 ${
            leftTab === "vault" ? tabActive : ""
          }`}
          onClick={() => setLeftTab("vault")}
        >
          Vault
        </button>
        <button
          type="button"
          className={`flex-1 px-3 py-2 ${
            leftTab === "jd" ? tabActive : ""
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
            selectedSections={selectedSections}
            dateFilterActive={Boolean(dateFrom || dateTo)}
            activeBlockIds={activePreset.activeBlockIds}
            rankings={rankings}
            canAddBlock={canAddBlock}
            onAdd={tryAddBlock}
            onTailorBullet={requestTailorConfirmation}
          />
        </div>
      ) : (
        <JDPanel
          jdText={jdText}
          matchLoading={matchLoading}
          lastMatchError={lastMatchError}
          parsedJD={parsedJD}
          coverage={coverage}
          ranked={rankedCards}
          tagMatches={tagMatches}
          preset={activePreset}
          onJdTextChange={setJdText}
          onAnalyze={() => void runAnalyze()}
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
      dropTargetSection={vaultDropTarget}
      removingBlockId={removingBlockId}
      placeholder={activeDrag?.origin === "vault" ? placeholder : null}
      dropBlocked={dropBlocked}
      arrangeMode={dragMode === "arrange"}
      onRemove={removeBlockFromResume}
      onTailorBullet={requestTailorConfirmation}
    />
  ) : (
    <p className="text-sm text-slate-500">Loading resume…</p>
  );

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      {(dropBlocked || spaceWarning) && (
        <p
          className={`shrink-0 border-b px-3 py-1.5 text-center text-xs ${
            dropBlocked
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
          role="status"
        >
          {dropBlocked ? spaceMessage : spaceWarning}
        </p>
      )}
      <DndContext
        id={DND_CONTEXT_ID}
        sensors={sensors}
        collisionDetection={resumeDropCollision}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragMove={handleDragMove}
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
              onNewDocument={createDocument}
              onRenameDocument={renameDocument}
              onCloseDocument={closeDocument}
              onReorderDocuments={reorderDocuments}
              onUndo={undo}
              onRedo={redo}
              onTemplateChange={setTemplate}
              dragMode={dragMode}
              onDragModeChange={setDragMode}
              onExportPdf={() => window.print()}
              onExportDocx={() => import("@/lib/exportDocx").then(({ downloadResumeDocx }) => downloadResumeDocx(activePreset, vaultBlocks))}
            />
          }
          leftPane={leftPane}
          canvas={canvas}
          mobilePane={mobilePane}
          onMobilePaneChange={setMobilePane}
          vaultDropActive={activeDrag?.origin === "canvas"}
        />
        </div>
        <DragOverlay
          className={dropBlocked ? "cursor-not-allowed" : undefined}
          dropAnimation={resumeDropAnimation}
        >
          {activeSection ? (
            <SectionOverlay snapshot={activeSection} />
          ) : overlayBlock && activeDrag ? (
            <CanvasBlockOverlay
              block={overlayBlock}
              preset={activePreset}
              width={activeDrag.origin === "vault" ? overlayWidth : undefined}
              blocked={activeDrag.origin === "vault" && dropBlocked}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
      {(tailorConfirmationBlock || (tailorBlock && tailorDialog && (tailorProposal || tailorLoading || tailorError))) && (
        <TailorDialog
          block={tailorConfirmationBlock ?? tailorBlock!}
          proposal={tailorProposal}
          loading={tailorLoading}
          error={tailorError}
          mock={mockTailoring}
          originalText={
            getEffectiveBullets(tailorConfirmationBlock ?? tailorBlock!, activePreset)[
              tailorConfirmation?.bulletIndex ?? tailorDialog!.bulletIndex
            ] ?? ""
          }
          confirmation={Boolean(tailorConfirmation)}
          onConfirm={confirmTailor}
          onRetry={() => {
            if (tailorDialog) void startTailor(tailorDialog.blockId, tailorDialog.bulletIndex);
          }}
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
            closeTailoring();
          }}
          onReject={() => {
            if (tailorConfirmation) {
              setTailorConfirmation(null);
            } else {
              closeTailoring();
            }
          }}
        />
      )}
    </div>
  );
}
