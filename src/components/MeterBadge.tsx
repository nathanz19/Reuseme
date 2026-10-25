"use client";

import { useId, useState, type ReactNode } from "react";

export function MeterBadge({ children, label, help, className, status = false }: {
  children: ReactNode; label: string; help: string; className: string; status?: boolean;
}) {
  const tooltipId = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const visible = hovered || focused;

  return <span tabIndex={0} aria-label={label} aria-describedby={visible ? tooltipId : undefined}
    onPointerEnter={(event) => { if (event.pointerType !== "touch") setHovered(true); }}
    onPointerLeave={() => setHovered(false)} onPointerCancel={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    onKeyDown={(event) => { if (event.key === "Escape") { setHovered(false); setFocused(false); } }}
    className="relative inline-flex cursor-help rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
    <span role={status ? "status" : undefined} aria-label={status ? label : undefined} className={className}>{children}</span>
    {visible && <span id={tooltipId} role="tooltip"
      className="absolute top-full left-0 z-50 pt-2">
      <span className="block w-64 max-w-[70vw] rounded-lg bg-accent px-3 py-2 text-xs leading-relaxed font-normal text-white shadow-lg">{help}</span>
    </span>}
  </span>;
}
