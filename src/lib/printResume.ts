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
  const content = document.createElement("div");
  content.className = "resume-print-content";
  content.style.display = "flow-root";
  while (copy.firstChild) content.appendChild(copy.firstChild);
  copy.appendChild(content);

  // Measure the complete content, including anything beyond the canvas's clipped edge.
  // Measure at full Letter size, outside the body's flex layout. Otherwise the
  // editor can flex-shrink this temporary page before the print stylesheet runs.
  copy.style.setProperty("display", "block", "important");
  copy.style.position = "fixed";
  copy.style.left = "-10000px";
  copy.style.top = "0";
  copy.style.flexShrink = "0";
  document.body.appendChild(copy);
  const style = getComputedStyle(copy);
  const availableHeight = copy.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const contentHeight = Math.max(content.scrollHeight, content.getBoundingClientRect().height);
  const scale = Math.min(1, availableHeight / Math.max(1, contentHeight + 1));
  content.style.transformOrigin = "top center";
  content.style.transform = `scale(${scale})`;
  copy.style.removeProperty("display");
  copy.style.removeProperty("position");
  copy.style.removeProperty("left");
  copy.style.removeProperty("top");
}

export function clearResumePrint() {
  document.getElementById("resume-print-copy")?.remove();
}
