/**
 * Print a standalone, unscaled clone of the canvas so editor scroll panes and
 * mobile visibility cannot hide it. The clone has the same classes, padding,
 * and content wrapper as the canvas, and the print stylesheet changes none of
 * its geometry. So the PDF wraps and clips exactly as the canvas does.
 */
export function prepareResumePrint() {
  clearResumePrint();
  const resume = document.getElementById("resume-print-root");
  if (!resume) return;
  const copy = resume.cloneNode(true) as HTMLElement;
  copy.id = "resume-print-copy";
  copy.removeAttribute("title");
  copy.querySelectorAll("button, .resume-hover-control, .overflow-label, .resume-drop-placeholder, .icon-tooltip")
    .forEach((control) => control.remove());
  document.body.appendChild(copy);
}

export function clearResumePrint() {
  document.getElementById("resume-print-copy")?.remove();
}
