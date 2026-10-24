import { SpaceMeter } from "@/components/SpaceMeter";
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
  onNewVersion: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onTemplateChange: (id: TemplateId) => void;
  onExportPdf: () => void;
}

export function Navbar({
  presets,
  activePresetId,
  templateId,
  vaultBlocks,
  activePreset,
  canUndo,
  canRedo,
  onPresetChange,
  onNewVersion,
  onUndo,
  onRedo,
  onTemplateChange,
  onExportPdf,
}: NavbarProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 text-sm">
      <select
        className="rounded border border-slate-300 bg-white px-2 py-1"
        value={activePresetId}
        onChange={(e) => onPresetChange(e.target.value)}
        aria-label="Resume preset"
      >
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
        onClick={onNewVersion}
      >
        New version
      </button>
      <button
        type="button"
        className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
        onClick={onUndo}
        disabled={!canUndo}
      >
        Undo
      </button>
      <button
        type="button"
        className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
        onClick={onRedo}
        disabled={!canRedo}
      >
        Redo
      </button>
      <select
        className="rounded border border-slate-300 bg-white px-2 py-1"
        value={templateId}
        onChange={(e) => onTemplateChange(e.target.value as TemplateId)}
        aria-label="Template"
      >
        <option value="classic-ats">Classic ATS</option>
        <option value="modern-tech">Modern Tech</option>
      </select>
      <SpaceMeter preset={activePreset} vaultBlocks={vaultBlocks} />
      <button
        type="button"
        className="ml-auto rounded border border-slate-800 bg-slate-900 px-3 py-1 text-white hover:bg-slate-800"
        onClick={onExportPdf}
        title="Open the print dialog, then choose Save as PDF"
      >
        Export PDF
      </button>
    </header>
  );
}
