/**
 * Collect every Almasix symbol hit in a buffer (quoted call sites + template vars).
 */
import { hitAt, type SymbolHit } from "./symbolLocator";

export function allHits(text: string): SymbolHit[] {
  const hits: SymbolHit[] = [];
  const seen = new Set<string>();

  const push = (hit: SymbolHit | null): void => {
    if (!hit) return;
    const key = `${hit.range.startOffset}:${hit.range.endOffset}:${hit.kind}:${hit.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push(hit);
  };

  const re = /(['"])([^'"\n]*)\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    push(hitAt(text, m.index + 1));
  }

  let i = 0;
  while (i < text.length) {
    const openEcho = text.indexOf("{{", i);
    const openRaw = text.indexOf("{!!", i);
    let open = -1;
    let openLen = 2;
    if (openEcho >= 0 && (openRaw < 0 || openEcho <= openRaw)) {
      open = openEcho;
      openLen = 2;
    } else if (openRaw >= 0) {
      open = openRaw;
      openLen = 3;
    }
    if (open < 0) break;
    const close = text.indexOf("}}", open + openLen);
    const end = close < 0 ? text.length : close;
    let j = open + openLen;
    while (j < end) {
      if (/[A-Za-z_]/.test(text[j]!)) {
        push(hitAt(text, j + 1));
        while (j < end && /[A-Za-z0-9_.]/.test(text[j]!)) j++;
        continue;
      }
      j++;
    }
    i = end + 2;
  }

  return hits;
}

export const SymbolHits = { allHits };
