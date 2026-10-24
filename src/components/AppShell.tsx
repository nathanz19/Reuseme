"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import { VAULT_DROP_ID } from "@/lib/dnd";

interface AppShellProps {
  navbar: ReactNode;
  leftPane: ReactNode;
  canvas: ReactNode;
  mobilePane: "vault" | "canvas";
  onMobilePaneChange: (pane: "vault" | "canvas") => void;
  vaultDropActive: boolean;
}

export function AppShell({
  navbar,
  leftPane,
  canvas,
  mobilePane,
  onMobilePaneChange,
  vaultDropActive,
}: AppShellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: VAULT_DROP_ID });

  const vaultHighlight = vaultDropActive && isOver;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-slate-100">
      {navbar}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden wide-two-pane:flex-row">
        <div className="flex shrink-0 border-b border-slate-200 bg-white text-sm wide-two-pane:hidden">
          <button
            type="button"
            className={`flex-1 px-3 py-2 ${
              mobilePane === "vault" ? "border-b-2 border-slate-900 font-medium" : ""
            }`}
            onClick={() => onMobilePaneChange("vault")}
          >
            Vault
          </button>
          <button
            type="button"
            className={`flex-1 px-3 py-2 ${
              mobilePane === "canvas" ? "border-b-2 border-slate-900 font-medium" : ""
            }`}
            onClick={() => onMobilePaneChange("canvas")}
          >
            Canvas
          </button>
        </div>
        <aside
          ref={setNodeRef}
          className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden border-slate-200 bg-white wide-two-pane:flex-none wide-two-pane:w-[min(480px,40%)] wide-two-pane:border-r ${
            mobilePane === "canvas" ? "hidden wide-two-pane:flex" : "flex"
          } ${vaultHighlight ? "bg-sky-50 ring-2 ring-inset ring-sky-300" : ""}`}
        >
          {leftPane}
        </aside>
        <main
          className={`min-h-0 min-w-0 flex-1 overflow-y-auto p-4 print:overflow-visible ${
            mobilePane === "vault" ? "hidden wide-two-pane:block" : "block"
          }`}
        >
          {canvas}
        </main>
      </div>
    </div>
  );
}
