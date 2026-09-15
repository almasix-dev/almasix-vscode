/**
 * Locate an Almasix symbol under the caret — quoted call-site strings or
 * bare identifiers inside `{{ … }}` / `{!! … !!}`.
 */
import { detect } from "./callSiteDetector";
import { SymbolKind } from "./types";

export interface TextRange {
  startOffset: number;
  endOffset: number;
}

export interface SymbolHit {
  kind: SymbolKind;
  name: string;
  range: TextRange;
  receiver?: string | null;
}

export function hitAt(text: string, offset: number): SymbolHit | null {
  if (offset < 0 || offset > text.length) return null;
  const lit = stringLiteralAt(text, offset);
  if (lit) {
    const probe = text.slice(0, lit.contentStart) + lit.value;
    const site = detect(probe);
    if (site) {
      const name =
        site.kind === SymbolKind.VALIDATION
          ? lit.value.split(":")[0]!.split("|")[0]!
          : lit.value;
      if (name) {
        return {
          kind: site.kind,
          name,
          range: { startOffset: lit.contentStart, endOffset: lit.contentEnd },
          receiver: site.receiver,
        };
      }
    }
  }
  const tv = templateVarAt(text, offset);
  if (tv) {
    return {
      kind: SymbolKind.TEMPLATE_VAR,
      name: tv.name,
      range: { startOffset: tv.start, endOffset: tv.end },
    };
  }
  return null;
}

function stringLiteralAt(
  text: string,
  offset: number,
): { contentStart: number; contentEnd: number; value: string } | null {
  if (offset <= 0 || offset > text.length) return null;
  let i = offset - 1;
  while (i >= 0 && text[i] !== "\n") {
    const c = text[i]!;
    if (c === '"' || c === "'") {
      const quote = c;
      const open = i;
      let j = i + 1;
      while (j < text.length && text[j] !== quote && text[j] !== "\n") j++;
      if (j < text.length && text[j] === quote && offset >= open + 1 && offset <= j) {
        return {
          contentStart: open + 1,
          contentEnd: j,
          value: text.slice(open + 1, j),
        };
      }
      return null;
    }
    i--;
  }
  return null;
}

function templateVarAt(
  text: string,
  offset: number,
): { start: number; end: number; name: string } | null {
  const before = text.slice(0, Math.min(offset, text.length));
  const a = before.lastIndexOf("{{");
  const b = before.lastIndexOf("{!!");
  const openEcho = Math.max(a, b);
  if (openEcho < 0) return null;
  const afterOpen = before.slice(openEcho);
  if (!afterOpen.startsWith("{{") && !afterOpen.startsWith("{!!")) return null;
  const closeFrom = openEcho + 2;
  const closeIdx = text.indexOf("}}", closeFrom);
  const close = closeIdx < 0 ? Number.MAX_SAFE_INTEGER : closeIdx;
  if (offset > close) return null;

  let start = offset;
  while (start > openEcho + 2 && /[A-Za-z0-9_]/.test(text[start - 1]!)) start--;
  if (start > openEcho + 2 && text[start - 1] === ".") {
    start--;
    while (start > openEcho + 2 && /[A-Za-z0-9_]/.test(text[start - 1]!)) start--;
  }
  while (start > openEcho + 2 && /[A-Za-z0-9_]/.test(text[start - 1]!)) start--;
  let end = start;
  while (end < text.length && end < close && /[A-Za-z0-9_]/.test(text[end]!)) end++;
  if (start >= end) return null;
  const between = text.slice(openEcho, start);
  if (between.includes("|")) return null;
  const name = text.slice(start, end);
  if (!name || /\d/.test(name[0]!)) return null;
  return { start, end, name };
}

export const SymbolLocator = { hitAt };
export const AlmasixSymbolLocator = SymbolLocator;
