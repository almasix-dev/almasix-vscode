import * as fs from "node:fs";
import * as path from "node:path";
import { CallSiteDetector } from "./callSiteDetector";
import type { TextRange } from "./symbolLocator";
import { SymbolKind } from "./types";

/**
 * Scoped scan for Almasix call-site usages (mirrors LSP `_iter_reference_sources`).
 */
export interface Occurrence {
  path: string;
  range: TextRange;
  kind: SymbolKind;
  name: string;
}

const SCAN_DIRS = [
  "app",
  "routes",
  "resources/views",
  "config",
  "database",
  "bootstrap",
  "tests",
];

const SKIP_DIR_NAMES = new Set([
  ".git",
  ".idea",
  ".tox",
  ".venv",
  "__pycache__",
  "build",
  "dist",
  "htmlcov",
  "node_modules",
  "storage",
  "vendor",
  "website",
  "editors",
  "docs",
]);

/** Kinds supported by Find Usages MVP. */
const SUPPORTED = new Set([
  SymbolKind.ROUTE,
  SymbolKind.VIEW,
  SymbolKind.CONFIG,
  SymbolKind.COMPONENT,
  SymbolKind.ENV,
]);

interface Span {
  start: number;
  end: number;
}

function candidateSpans(text: string, kind: SymbolKind, name: string): Span[] {
  const out: Span[] = [];
  for (const quote of ['"', "'"] as const) {
    const needle = `${quote}${name}${quote}`;
    let from = 0;
    while (true) {
      const idx = text.indexOf(needle, from);
      if (idx < 0) break;
      out.push({ start: idx + 1, end: idx + 1 + name.length });
      from = idx + needle.length;
    }
  }
  if (kind === SymbolKind.COMPONENT) {
    const tag = `<x-${name}`;
    let from = 0;
    while (true) {
      const idx = text.indexOf(tag, from);
      if (idx < 0) break;
      const start = idx + 3; // after <x-
      out.push({ start, end: start + name.length });
      from = idx + tag.length;
    }
  }
  if (kind === SymbolKind.ENV) {
    const interp = `\${${name}}`;
    let from = 0;
    while (true) {
      const idx = text.indexOf(interp, from);
      if (idx < 0) break;
      out.push({ start: idx + 2, end: idx + 2 + name.length });
      from = idx + interp.length;
    }
    const assign = new RegExp(
      `(?:^|\\n)\\s*(?:export\\s+)?(${escapeRegExp(name)})\\s*=`,
      "g",
    );
    let m: RegExpExecArray | null;
    while ((m = assign.exec(text)) !== null) {
      const g = m[1];
      if (!g) continue;
      const start = m.index + m[0].indexOf(g);
      out.push({ start, end: start + name.length });
    }
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function walkSourceFiles(appRoot: string, kind: SymbolKind): string[] {
  const files: string[] = [];
  const bases = SCAN_DIRS.map((d) => path.join(appRoot, d)).filter((d) => {
    try {
      return fs.statSync(d).isDirectory();
    } catch {
      return false;
    }
  });
  const roots =
    bases.length > 0
      ? bases
      : (() => {
          try {
            return fs.statSync(appRoot).isDirectory() ? [appRoot] : [];
          } catch {
            return [];
          }
        })();

  const walk = (dir: string, base: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (full !== base && (SKIP_DIR_NAMES.has(ent.name) || ent.name.startsWith("."))) {
          continue;
        }
        walk(full, base);
      } else if (ent.isFile()) {
        if (ent.name.endsWith(".py") || ent.name.endsWith(".prism.html")) {
          files.push(path.resolve(full));
        }
      }
    }
  };

  for (const base of roots) walk(base, base);

  if (kind === SymbolKind.ENV) {
    try {
      if (fs.statSync(appRoot).isDirectory()) {
        for (const child of fs.readdirSync(appRoot)) {
          if (child === ".env" || child.startsWith(".env.")) {
            const full = path.join(appRoot, child);
            try {
              if (fs.statSync(full).isFile()) files.push(path.resolve(full));
            } catch {
              /* skip */
            }
          }
        }
      }
    } catch {
      /* skip */
    }
  }

  return [...new Set(files)];
}

export const CallSiteSearcher = {
  SUPPORTED,

  findUsages(appRoot: string, kind: SymbolKind, name: string): Occurrence[] {
    if (!name.trim() || !SUPPORTED.has(kind)) return [];
    const out: Occurrence[] = [];
    const seen = new Set<string>();
    for (const file of walkSourceFiles(appRoot, kind)) {
      let text: string;
      try {
        text = fs.readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const base = path.basename(file);
      const dotenv = base === ".env" || base.startsWith(".env.");
      for (const occ of CallSiteSearcher.findInText(text, kind, name, dotenv)) {
        const key = `${file}:${occ.range.startOffset}:${occ.range.endOffset}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ ...occ, path: file });
      }
    }
    return out;
  },

  /** Pure text search — used by unit tests without a real app tree. */
  findInText(
    text: string,
    kind: SymbolKind,
    name: string,
    dotenvFile = false,
  ): Occurrence[] {
    const dummy = "in-memory";
    const out: Occurrence[] = [];
    const seen = new Set<string>();
    for (const span of candidateSpans(text, kind, name)) {
      const probe = text.slice(0, span.start) + name;
      const site = CallSiteDetector.detect(probe, dotenvFile);
      if (!site) continue;
      if (site.kind !== kind) continue;
      if (site.prefix !== name) continue;
      const key = `${span.start}:${span.end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        path: dummy,
        range: { startOffset: span.start, endOffset: span.end },
        kind: site.kind,
        name,
      });
    }
    return out;
  },
};

export const AlmasixCallSiteSearcher = CallSiteSearcher;
