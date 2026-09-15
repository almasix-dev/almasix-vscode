/**
 * Prism block-structure checks: unmatched open/close directives.
 */

export interface StructureIssue {
  startOffset: number;
  endOffset: number;
  message: string;
}

export type PrismIssue = StructureIssue;

export const PAIRS: Record<string, string> = {
  if: "endif",
  unless: "endunless",
  isset: "endisset",
  empty: "endempty",
  for: "endfor",
  foreach: "endforeach",
  forelse: "endforelse",
  while: "endwhile",
  section: "endsection",
  component: "endcomponent",
  slot: "endslot",
  push: "endpush",
  prepend: "endprepend",
  once: "endonce",
  python: "endpython",
  error: "enderror",
  auth: "endauth",
  guest: "endguest",
  can: "endcan",
  cannot: "endcannot",
  canany: "endcanany",
  cannotany: "endcannotany",
  cache: "endcache",
};

/** Closers that alias another PAIRS value (compiler: `@show` ends `@section`). */
const CLOSER_ALIASES: Record<string, string> = {
  show: "endsection",
};

/** Openers that may be one-line / self-closing when args include a value. */
const INLINEABLE = new Set(["section"]);

const OPENERS = new Set(Object.keys(PAIRS));
const CLOSERS = new Set([...Object.values(PAIRS), ...Object.keys(CLOSER_ALIASES)]);
const DIRECTIVE = /@([A-Za-z_][\w]*)/g;

/**
 * True when ``@section('name', 'value')`` (compiler ``section_inline``):
 * a top-level comma inside the directive's parentheses.
 */
export function isInlineDirective(text: string, atNameEnd: number): boolean {
  let i = atNameEnd;
  while (i < text.length && /\s/.test(text[i]!)) i++;
  if (text[i] !== "(") return false;
  i++; // past '('
  let depth = 1;
  let quote: "'" | '"' | null = null;
  let sawTopLevelComma = false;
  while (i < text.length && depth > 0) {
    const ch = text[i]!;
    if (quote) {
      if (ch === "\\" && i + 1 < text.length) {
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      i++;
      continue;
    }
    if (ch === "(") {
      depth++;
      i++;
      continue;
    }
    if (ch === ")") {
      depth--;
      i++;
      continue;
    }
    if (ch === "," && depth === 1) {
      sawTopLevelComma = true;
    }
    i++;
  }
  return sawTopLevelComma && depth === 0;
}

export function analyze(text: string): StructureIssue[] {
  type Frame = { name: string; start: number; end: number };
  const stack: Frame[] = [];
  const issues: StructureIssue[] = [];
  for (const m of text.matchAll(DIRECTIVE)) {
    const name = m[1]!;
    const start = m.index ?? 0;
    const end = start + m[0]!.length;
    if (OPENERS.has(name)) {
      if (INLINEABLE.has(name) && isInlineDirective(text, end)) {
        continue;
      }
      stack.push({ name, start, end });
    } else if (CLOSERS.has(name)) {
      const closer = CLOSER_ALIASES[name] ?? name;
      if (!stack.length) {
        issues.push({ startOffset: start, endOffset: end, message: `Unexpected @${name} (no matching open)` });
        continue;
      }
      const top = stack.pop()!;
      const expected = PAIRS[top.name];
      if (expected !== closer) {
        issues.push({
          startOffset: start,
          endOffset: end,
          message: `Expected @${expected} to close @${top.name}, found @${name}`,
        });
        stack.push(top);
      }
    }
  }
  for (const frame of stack) {
    issues.push({
      startOffset: frame.start,
      endOffset: frame.end,
      message: `Unclosed @${frame.name} (expected @${PAIRS[frame.name]})`,
    });
  }
  return issues;
}

export const PRISM_PAIRS = PAIRS;

export const PrismStructure = { PAIRS, analyze, isInlineDirective };

export const AlmasixPrismStructure = PrismStructure;
