/** Print a standalone copy so editor scroll panes and mobile visibility cannot hide it. */
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
