"use client";

import { useId, useState, type ReactNode } from "react";

export function IconAction({ label, onClick, children, danger = false, className = "" }: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  className?: string;
}) {
  const tooltipId = useId();
  const [hovered, setHovered] = useState(false);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const showTooltip = hovered || keyboardFocused;
  return (
    <button type="button" aria-label={label} aria-describedby={showTooltip ? tooltipId : undefined}
      onPointerEnter={(event) => { if (event.pointerType !== "touch") setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      onPointerCancel={() => setHovered(false)}
      onFocus={(event) => setKeyboardFocused(event.currentTarget.matches(":focus-visible"))}
      onBlur={() => setKeyboardFocused(false)}
      onClick={() => { setHovered(false); setKeyboardFocused(false); onClick(); }}
      className={`icon-action ${className.includes("absolute") ? "absolute" : "relative"} inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/95 text-slate-400 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-slate-100 hover:text-slate-800"} ${className}`}>
      {children}
      {showTooltip && <span id={tooltipId} role="tooltip" className="icon-tooltip pointer-events-none absolute right-0 top-full z-50 mt-1 whitespace-nowrap rounded bg-slate-800 px-2 py-1 font-sans text-xs font-normal normal-case tracking-normal text-white shadow-sm">
        {label}
      </span>}
    </button>
  );
}
