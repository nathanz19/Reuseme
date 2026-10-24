"use client";

import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type Modifier } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FileText, Plus, Undo2, Redo2, Download, Pencil, X, ChevronDown } from "lucide-react";
import { IconAction } from "@/components/IconAction";
import { SpaceMeter } from "@/components/SpaceMeter";
import { btnExport, fieldBorder, focusRing } from "@/lib/theme";
import { isWithinLineBudget } from "@/lib/lineCount";
import type { AccomplishmentBlock, ResumePreset, TemplateId } from "@/types/resume";

interface NavbarProps {
  presets: ResumePreset[];
  activePresetId: string;
  templateId: TemplateId;
  vaultBlocks: AccomplishmentBlock[];
  activePreset: ResumePreset;
  canUndo: boolean;
  canRedo: boolean;
  onPresetChange: (id: string) => void;
  onNewDocument: () => void;
  onRenameDocument: (id: string, name: string) => void;
  onCloseDocument: (id: string) => void;
  onReorderDocuments: (activeId: string, overId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onTemplateChange: (id: TemplateId) => void;
  onExportPdf: () => void;
  onExportDocx: () => Promise<void>;
}

export function Navbar({ presets, activePresetId, templateId, vaultBlocks, activePreset,
  canUndo, canRedo, onPresetChange, onNewDocument, onRenameDocument, onCloseDocument, onReorderDocuments, onUndo, onRedo, onTemplateChange, onExportPdf, onExportDocx,
}: NavbarProps) {
  const tabSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [closingDocument, setClosingDocument] = useState<ResumePreset | null>(null);
  const cancelRename = useRef(false);
  const startRename = (preset: ResumePreset) => {
    cancelRename.current = false;
    setRenaming({ id: preset.id, name: preset.name });
  };
  const canExport = isWithinLineBudget(activePreset, vaultBlocks);
  return (
    <header className="z-10 shrink-0 border-b border-border bg-surface text-sm shadow-[var(--shadow-soft)] print:hidden">
      <DndContext id="document-tabs" sensors={tabSensors} collisionDetection={closestCenter}
        modifiers={[horizontalOnly]} onDragEnd={({ active, over }) => {
          if (over && active.id !== over.id) onReorderDocuments(String(active.id), String(over.id));
        }}>
      <nav aria-label="Documents" className="flex items-end gap-1.5 border-b border-border bg-background px-4 pt-1">
        <div role="tablist" aria-label="Resume documents" className="no-scrollbar flex min-w-0 gap-0.5 overflow-x-auto">
          <SortableContext items={presets.map((preset) => preset.id)} strategy={horizontalListSortingStrategy}>
          {presets.map((preset, index) => {
            const selected = preset.id === activePresetId;
            return <SortableDocumentTab key={preset.id} id={preset.id} disabled={renaming?.id === preset.id}
              className={`flex h-8 max-w-80 min-w-36 shrink-0 items-center gap-0.5 rounded-t-md border pl-2 pr-0.5 transition-colors ${selected ? "border-border border-b-surface bg-surface text-ink" : "border-border/70 bg-surface-muted/80 text-ink-muted hover:text-ink"}`}>
              <FileText size={14} aria-hidden="true" className="shrink-0" />
              {renaming?.id === preset.id ? (
                <input aria-label="Document name" value={renaming.name} autoFocus maxLength={120}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => setRenaming({ id: preset.id, name: event.target.value })}
                  onBlur={() => {
                    if (!cancelRename.current) onRenameDocument(preset.id, renaming.name);
                    setRenaming(null);
                  }}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); }
                    if (event.key === "Escape") { cancelRename.current = true; setRenaming(null); }
                  }}
                  className={`my-0.5 w-36 min-w-0 border px-1 py-0.5 text-sm outline-none ${fieldBorder} ${focusRing}`} />
              ) : (
                <button type="button" role="tab" aria-label={preset.name} aria-selected={selected}
                  tabIndex={selected ? 0 : -1} onClick={() => onPresetChange(preset.id)}
                  onDoubleClick={() => startRename(preset)}
                  onKeyDown={(event) => {
                    if (event.key === "F2") { event.preventDefault(); startRename(preset); return; }
                    let next = index;
                    if (event.key === "ArrowRight") next = (index + 1) % presets.length;
                    else if (event.key === "ArrowLeft") next = (index - 1 + presets.length) % presets.length;
                    else if (event.key === "Home") next = 0;
                    else if (event.key === "End") next = presets.length - 1;
                    else return;
                    event.preventDefault();
                    onPresetChange(presets[next].id);
                    event.currentTarget.closest('[role="tablist"]')?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
                  }}
                  className={`min-w-0 flex-1 truncate px-1.5 py-1 text-left focus-visible:outline-2 focus-visible:outline-focus-ring ${selected ? "font-medium" : ""}`}>
                  {preset.name}
                </button>
              )}
              <IconAction label={`Rename ${preset.name}`} onClick={() => startRename(preset)} className="h-6! w-6! bg-transparent!"><Pencil size={12} aria-hidden="true" /></IconAction>
              <IconAction label={`Close ${preset.name}`} onClick={() => setClosingDocument(preset)} className="h-6! w-6! bg-transparent!"><X size={14} aria-hidden="true" /></IconAction>
            </SortableDocumentTab>;
          })}
          </SortableContext>
        </div>
        <div className="mb-px shrink-0">
          <IconAction label="New document" onClick={onNewDocument} className="h-7! w-7!"><Plus size={16} aria-hidden="true" /></IconAction>
        </div>
      </nav>
      </DndContext>
      <div role="toolbar" aria-label="Document editing" className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1 text-ink">
        <div className="flex items-center gap-0.5 border-r border-border pr-3">
          <IconAction label="Undo" onClick={onUndo} disabled={!canUndo} className="h-6! w-6!"><Undo2 size={16} aria-hidden="true" /></IconAction>
          <IconAction label="Redo" onClick={onRedo} disabled={!canRedo} className="h-6! w-6!"><Redo2 size={16} aria-hidden="true" /></IconAction>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-accent-text">
          Template
          <select value={templateId} onChange={(event) => onTemplateChange(event.target.value as TemplateId)}
            aria-label="Template" className={`px-2 py-0.5 text-xs transition-colors hover:border-accent-border ${fieldBorder} ${focusRing}`}>
            <option value="classic-ats">Classic ATS</option>
            <option value="modern-tech">Modern Tech</option>
          </select>
        </label>
        <SpaceMeter preset={activePreset} vaultBlocks={vaultBlocks} />
        <ExportControl canExport={canExport} onExportPdf={onExportPdf} onExportDocx={onExportDocx} />
      </div>
      {closingDocument && <DeleteDocumentDialog name={closingDocument.name}
        onCancel={() => setClosingDocument(null)}
        onConfirm={() => { onCloseDocument(closingDocument.id); setClosingDocument(null); }} />}
    </header>
  );
}

function DeleteDocumentDialog({ name, onCancel, onConfirm }: {
  name: string; onCancel: () => void; onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return createPortal(
    <dialog ref={dialogRef} aria-labelledby="delete-document-title" aria-describedby="delete-document-description"
      onCancel={onCancel}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-black/40 print:hidden">
      <h2 id="delete-document-title" className="text-lg font-semibold">Delete document?</h2>
      <p id="delete-document-description" className="mt-3 text-sm text-slate-600">
        Are you sure you want to delete “{name}”? You can undo this using Undo in the editing toolbar.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" autoFocus onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">Cancel</button>
        <button type="button" onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete document</button>
      </div>
    </dialog>, document.body,
  );
}


const EXPORT_MENU_ID = "export-format-menu";

function ExportControl({ canExport, onExportPdf, onExportDocx }: {
  canExport: boolean;
  onExportPdf: () => void;
  onExportDocx: () => Promise<void>;
}) {
  const [showExportHelp, setShowExportHelp] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const exporting = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!canExport) menuRef.current?.hidePopover();
  }, [canExport]);

  const placeMenu = () => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;
    const rect = button.getBoundingClientRect();
    const width = menu.offsetWidth || 256;
    const alignRight = Math.max(8, window.innerWidth - rect.right);
    const left = window.innerWidth - alignRight - width;
    menu.style.margin = "0";
    menu.style.position = "fixed";
    menu.style.inset = "auto";
    menu.style.top = `${rect.bottom + 8}px`;
    if (left < 8) {
      menu.style.left = "8px";
      menu.style.right = "auto";
    } else {
      menu.style.left = "auto";
      menu.style.right = `${alignRight}px`;
    }
  };

  const exportDocx = async () => {
    if (exporting.current) return;
    exporting.current = true;
    menuRef.current?.hidePopover();
    setExportError(null);
    try {
      await onExportDocx();
    } catch {
      setExportError("Couldn't create the Word document. Try again.");
    } finally {
      exporting.current = false;
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = event.key === "ArrowDown" ? index + 1 : index - 1;
      items[(next + items.length) % items.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

  return (
    <div data-export-control className={`relative ml-auto ${!canExport ? "cursor-not-allowed" : ""}`}
      tabIndex={!canExport ? 0 : undefined}
      aria-label={!canExport ? "Export unavailable" : undefined}
      aria-describedby={!canExport && showExportHelp ? "export-space-error" : undefined}
      onPointerEnter={() => setShowExportHelp(true)} onPointerLeave={() => setShowExportHelp(false)}
      onFocus={() => setShowExportHelp(true)} onBlur={() => setShowExportHelp(false)}>
      {!canExport && showExportHelp && <p id="export-space-error" role="tooltip" className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-red-100 bg-white px-3 py-2 text-xs text-red-700 shadow-lg">Remove or shorten content to fit one page before exporting.</p>}
      <button ref={buttonRef} type="button" disabled={!canExport} popoverTarget={EXPORT_MENU_ID}
        aria-haspopup="menu" aria-expanded={menuOpen} aria-controls={EXPORT_MENU_ID}
        aria-describedby={!canExport && showExportHelp ? "export-space-error" : undefined}
        onClick={() => { if (canExport) placeMenu(); }}
        className={`${btnExport} gap-1! px-2.5! py-1! text-xs! shadow-none!`}>
        <Download size={14} aria-hidden="true" />Export<ChevronDown size={12} aria-hidden="true" />
      </button>
      <div ref={menuRef} id={EXPORT_MENU_ID} popover="auto" role="menu" aria-label="Export format"
        onToggle={(event) => {
          const open = event.newState === "open";
          setMenuOpen(open);
          if (!open) return;
          setExportError(null);
          placeMenu();
          event.currentTarget.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
        }}
        onKeyDown={onMenuKeyDown}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.hidePopover();
        }}
        className="w-64 rounded-lg border border-slate-200 bg-white p-1 text-left text-slate-900 shadow-lg print:hidden">
        <button type="button" role="menuitem" onClick={() => { menuRef.current?.hidePopover(); onExportPdf(); }}
          className="block w-full rounded-md px-3 py-2 text-left hover:bg-slate-100 focus:bg-slate-100 focus-visible:outline-2 focus-visible:outline-sky-600">
          <span className="block text-sm font-medium">PDF</span>
          <span className="block text-xs font-normal text-slate-500">Open the print dialog, then choose Save as PDF</span>
        </button>
        <button type="button" role="menuitem" onClick={() => { void exportDocx(); }}
          className="block w-full rounded-md px-3 py-2 text-left hover:bg-slate-100 focus:bg-slate-100 focus-visible:outline-2 focus-visible:outline-sky-600">
          <span className="block text-sm font-medium">Word (.docx)</span>
          <span className="block text-xs font-normal text-slate-500">Download a Word document of this resume</span>
        </button>
      </div>
      {exportError && <p role="alert" className="mt-1 text-right text-xs text-red-700">{exportError}</p>}
    </div>
  );
}

const horizontalOnly: Modifier = ({ transform }) => ({ ...transform, y: 0 });

function SortableDocumentTab({ id, disabled, className, children }: {
  id: string; disabled: boolean; className: string; children: ReactNode;
}) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id, disabled });
  return <div ref={setNodeRef} role="presentation" {...listeners} className={className}
    style={{
      transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
      transition,
      touchAction: "pan-y",
      position: "relative",
      zIndex: isDragging ? 1 : undefined,
      opacity: isDragging ? 0.7 : 1,
    }}>
    {children}
  </div>;
}
