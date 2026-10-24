export interface DiffPart {
  text: string;
  added?: boolean;
  removed?: boolean;
}

/** Simple word-level diff for tailor preview. */
export function diffWords(original: string, revised: string): DiffPart[] {
  const a = original.split(/(\s+)/);
  const b = revised.split(/(\s+)/);
  const parts: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (a[i] === b[j]) {
      parts.push({ text: a[i] ?? "" });
      i++;
      j++;
      continue;
    }
    const nextInB = b.indexOf(a[i], j);
    const nextInA = a.indexOf(b[j], i);
    if (nextInB === -1 && nextInA === -1) {
      if (j < b.length) {
        parts.push({ text: b[j], added: true });
        j++;
      }
      if (i < a.length) {
        parts.push({ text: a[i], removed: true });
        i++;
      }
      continue;
    }
    if (nextInB !== -1 && (nextInA === -1 || nextInB - j <= nextInA - i)) {
      while (j < nextInB) {
        parts.push({ text: b[j], added: true });
        j++;
      }
    } else {
      while (i < nextInA) {
        parts.push({ text: a[i], removed: true });
        i++;
      }
    }
  }
  return parts.filter((p) => p.text.length > 0);
}
