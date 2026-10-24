"use client";

import { useDroppable } from "@dnd-kit/core";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { VAULT_DROP_ID } from "@/lib/dnd";

const wideQuery = "(min-width: 1320px)";
function subscribeToWidth(callback: () => void) {
  const media = window.matchMedia(wideQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function isWide() { return window.matchMedia(wideQuery).matches; }

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
  const wide = useSyncExternalStore(subscribeToWidth, isWide, () => false);
  const [collapsed, setCollapsed] = useState(false);
  const [handleVisible, setHandleVisible] = useState(false);
  const [animateSidebar, setAnimateSidebar] = useState(false);
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1320px)");
    const reset = () => { if (!wide.matches) setCollapsed(false); };
    wide.addEventListener("change", reset);
    return () => wide.removeEventListener("change", reset);
  }, []);
  const { setNodeRef, isOver } = useDroppable({ id: VAULT_DROP_ID, disabled: collapsed });

  const vaultHighlight = vaultDropActive && isOver;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {navbar}
      <div data-mobile-pane={mobilePane} style={{ flexDirection: wide ? "row" : "column" }} className="workspace-layout relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div style={{ display: wide ? "none" : "flex" }} className="workspace-pane-switch flex shrink-0 border-b border-border bg-surface text-sm">
          <button
            type="button"
            className={`flex-1 px-3 py-2 ${
              mobilePane === "vault" ? "border-b-2 border-ink font-medium text-ink" : ""
            }`}
            onClick={() => onMobilePaneChange("vault")}
          >
            Vault
          </button>
          <button
            type="button"
            className={`flex-1 px-3 py-2 ${
              mobilePane === "canvas" ? "border-b-2 border-ink font-medium text-ink" : ""
            }`}
            onClick={() => onMobilePaneChange("canvas")}
          >
            Canvas
          </button>
        </div>
        <aside
          ref={setNodeRef}
          onPointerEnter={() => setHandleVisible(true)}
          onPointerMove={() => setHandleVisible(true)}
          onPointerLeave={() => setHandleVisible(false)}
          id="vault-jd-sidebar"
          aria-label="Vault and job description"
          aria-hidden={collapsed}
          inert={collapsed}
          data-collapsed={collapsed}
          style={{ transition: animateSidebar ? undefined : "none", display: wide || mobilePane === "vault" ? "flex" : "none", width: wide ? (collapsed ? 0 : "min(480px, 40vw)") : "100%", flex: wide ? "0 0 auto" : "1 1 0%" }}
          className={`workspace-sidebar flex min-h-0 w-full flex-1 flex-col overflow-hidden border-border bg-surface ${vaultHighlight ? "bg-accent-subtle ring-2 ring-inset ring-accent-border" : ""}`}
        >
          <div style={{ width: wide ? "min(480px, 40vw)" : "100%" }} className="workspace-sidebar-content flex min-h-0 flex-1 flex-col overflow-hidden">{leftPane}</div>
        </aside>
        <div data-collapsed={collapsed} data-visible={handleVisible || collapsed}
          onPointerEnter={() => setHandleVisible(true)} onPointerLeave={() => setHandleVisible(false)}
          onFocus={(event) => { if (event.target.matches(":focus-visible")) setHandleVisible(true); }}
          onBlur={() => setHandleVisible(false)}
          style={{ display: wide ? "flex" : "none", left: collapsed ? "0px" : "min(480px, 40vw)" }} className="workspace-sidebar-toggle absolute top-1/2 z-30 items-center justify-center print:hidden">
          <button type="button" aria-controls="vault-jd-sidebar" aria-expanded={!collapsed}
            aria-label={collapsed ? "Show Vault and job description" : "Hide Vault and job description"}
            title={collapsed ? "Show Vault and job description" : "Hide Vault and job description"}
            onClick={(event) => {
              setAnimateSidebar(true);
              setCollapsed((value) => !value);
              setHandleVisible(false);
              if (event.detail > 0) event.currentTarget.blur();
            }}
            className="flex h-18 w-7 items-center justify-center rounded-r-lg border border-l-0 border-border-strong bg-surface text-ink-muted shadow-sm transition-colors hover:bg-accent-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-focus-ring">
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
        <main
          style={{ display: wide || mobilePane === "canvas" ? "block" : "none" }}
          className="workspace-canvas min-h-0 min-w-0 flex-1 overflow-y-auto p-4 print:overflow-visible"
        >
          {canvas}
        </main>
      </div>
    </div>
  );
}
