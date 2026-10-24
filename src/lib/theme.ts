/** Shared Tailwind class fragments for the app chrome (not resume print output). */

export const btnPrimary =
  "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted";

export const btnPrimarySm =
  "rounded bg-primary px-3 py-2 text-sm text-white transition-colors hover:bg-primary-hover disabled:cursor-default disabled:opacity-70";

/** Export PDF — filled sage by default, darker sage on hover */
export const btnExport =
  "rounded-lg border border-accent bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:border-accent-hover hover:bg-accent-hover disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-muted disabled:text-ink-muted disabled:shadow-none";

export const btnSecondary =
  "rounded-lg border border-border-strong bg-surface px-4 py-2 text-sm text-ink-muted transition-colors hover:border-accent-border hover:bg-accent-subtle hover:text-accent-text";

export const headingLg = "text-lg font-semibold text-ink";

export const tabActive = "border-b-2 border-accent font-medium text-ink";

export const btnOutlineSm =
  "rounded border border-accent-border bg-surface px-2 py-1 text-xs text-accent-text transition-colors hover:bg-accent-subtle disabled:cursor-default disabled:border-border disabled:bg-surface-muted disabled:text-ink-muted";

export const accentChip =
  "border border-accent-border bg-accent-subtle text-accent-text";

export const accentHoverSurface =
  "hover:border-accent-border hover:bg-accent-subtle";

export const fieldBorder =
  "rounded-md border border-border-strong bg-surface text-sm text-ink";

export const focusRing =
  "focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";
