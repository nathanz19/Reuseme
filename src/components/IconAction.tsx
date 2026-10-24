"use client";

import { useId, useState, type ReactNode } from "react";

export function IconAction({ label, onClick, children, danger = false, disabled = false, className = "" }: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const tooltipId = useId();
  const [hovered, setHovered] = useState(false);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const showTooltip = hovered || keyboardFocused;
  return (
    <button type="button" disabled={disabled} aria-label={label} aria-describedby={showTooltip ? tooltipId : undefined}
      onPointerEnter={(event) => { if (event.pointerType !== "touch") setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      onPointerCancel={() => setHovered(false)}
      onFocus={(event) => setKeyboardFocused(event.currentTarget.matches(":focus-visible"))}
      onBlur={() => setKeyboardFocused(false)}
      onClick={() => { setHovered(false); setKeyboardFocused(false); onClick(); }}
      className={`icon-action ${className.includes("absolute") ? "absolute" : "relative"} disabled:cursor-not-allowed disabled:opacity-35 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent bg-surface/95 text-ink-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${danger ? "hover:bg-red-50 hover:text-red-600" : "hover:border-accent-border hover:bg-accent-subtle hover:text-accent-text"} ${className}`}>
      {children}
      {showTooltip && <span id={tooltipId} role="tooltip" className="icon-tooltip pointer-events-none absolute right-0 top-full z-50 mt-1 whitespace-nowrap rounded bg-ink px-2 py-1 font-sans text-xs font-normal normal-case tracking-normal text-white shadow-sm">
        {label}
      </span>}
    </button>
  );
}
