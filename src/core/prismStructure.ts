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

const OPENERS = new Set(Object.keys(PAIRS));
const CLOSERS = new Set(Object.values(PAIRS));
const DIRECTIVE = /@([A-Za-z_][\w]*)/g;

export function analyze(text: string): StructureIssue[] {
  type Frame = { name: string; start: number; end: number };
  const stack: Frame[] = [];
  const issues: StructureIssue[] = [];
  for (const m of text.matchAll(DIRECTIVE)) {
    const name = m[1]!;
    const start = m.index ?? 0;
    const end = start + m[0]!.length;
    if (OPENERS.has(name)) {
      stack.push({ name, start, end });
    } else if (CLOSERS.has(name)) {
      if (!stack.length) {
        issues.push({ startOffset: start, endOffset: end, message: `Unexpected @${name} (no matching open)` });
        continue;
      }
      const top = stack.pop()!;
      const expected = PAIRS[top.name];
      if (expected !== name) {
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

export const PrismStructure = { PAIRS, analyze };

export const AlmasixPrismStructure = PrismStructure;
