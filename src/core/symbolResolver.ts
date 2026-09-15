/**
 * Resolve an indexed symbol name to a filesystem location.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { AlmasixIndex } from "./types";
import { SymbolKind } from "./types";

export interface ResolveTarget {
  path: string;
  line: number;
}

/** Alias matching JetBrains AlmasixSymbolResolver.Target. */
export type SymbolTarget = ResolveTarget;

export function resolve(
  index: AlmasixIndex,
  kind: SymbolKind,
  name: string,
  receiver?: string | null,
  viewName?: string | null,
): ResolveTarget | null {
  if (!name.trim()) return null;
  switch (kind) {
    case SymbolKind.ROUTE: {
      const route = index.routes[name];
      if (!route?.path) return null;
      return { path: route.path, line: route.line ?? 0 };
    }
    case SymbolKind.VIEW: {
      const p = index.views[name];
      return p ? { path: p, line: 0 } : null;
    }
    case SymbolKind.CONFIG:
      return resolveConfig(index, name);
    case SymbolKind.ENV: {
      const entry = index.envKeys[name];
      if (!entry) return null;
      if (entry.path) return { path: entry.path, line: entry.line ?? 0 };
      const origin = entry.usedBy?.[0];
      return origin ? parseUsedBy(index.basePath, origin) : null;
    }
    case SymbolKind.ENV_VALUE:
      return null;
    case SymbolKind.TABLE: {
      const table = index.tables[name];
      if (!table?.path) return null;
      return { path: table.path, line: table.line ?? 0 };
    }
    case SymbolKind.COLUMN:
      return resolveColumn(index, receiver, name);
    case SymbolKind.COMPONENT: {
      const p = index.components[name] ?? index.views[`components.${name}`];
      return p ? { path: p, line: 0 } : null;
    }
    case SymbolKind.VITE: {
      const p = index.viteEntries[name] ?? index.views[name];
      return p ? { path: p, line: 0 } : null;
    }
    case SymbolKind.RELATION:
      return resolveRelation(index, name, receiver);
    case SymbolKind.TEMPLATE_VAR:
      return resolveTemplateVar(index, name, viewName);
    default:
      return null;
  }
}

export function resolveColumn(
  index: AlmasixIndex,
  tableHint: string | null | undefined,
  column: string,
): ResolveTarget | null {
  if (!column.trim()) return null;
  const fromTable = (table: (typeof index.tables)[string]): ResolveTarget | null => {
    const col = table.columns?.[column];
    if (!col) return null;
    const p = col.path ?? table.path;
    if (!p) return null;
    return { path: p, line: col.line ?? 0 };
  };
  if (tableHint) {
    const direct = index.tables[tableHint];
    if (direct) {
      const t = fromTable(direct);
      if (t) return t;
    }
    const plural = index.tables[`${tableHint}s`];
    if (plural) {
      const t = fromTable(plural);
      if (t) return t;
    }
    const singular = index.tables[tableHint.replace(/s$/, "")];
    if (singular) {
      const t = fromTable(singular);
      if (t) return t;
    }
  }
  for (const table of Object.values(index.tables)) {
    const t = fromTable(table);
    if (t) return t;
  }
  return null;
}

function resolveConfig(index: AlmasixIndex, name: string): ResolveTarget | null {
  const loc = index.configLocations[name];
  if (loc?.path) return { path: loc.path, line: loc.line ?? 0 };
  const stem = name.includes(".") ? name.slice(0, name.indexOf(".")) : name;
  const filePath = index.configFiles[stem];
  if (!filePath) return null;
  const after = name.includes(".") ? name.slice(name.indexOf(".") + 1) : "";
  if (!after) return { path: filePath, line: 0 };
  return { path: filePath, line: locateNestedKeyLine(filePath, after.split(".")) };
}

function resolveRelation(
  index: AlmasixIndex,
  name: string,
  receiver: string | null | undefined,
): ResolveTarget | null {
  let entry: [string, (typeof index.modelMetadata)[string]] | undefined;
  if (receiver) {
    const simple = receiver.includes(".")
      ? receiver.slice(receiver.lastIndexOf(".") + 1)
      : receiver;
    entry = Object.entries(index.modelMetadata).find(
      ([className, m]) =>
        (m.relations ?? []).includes(name) &&
        (className.toLowerCase() === simple.toLowerCase() ||
          m.module?.toLowerCase() === simple.toLowerCase() ||
          className.toLowerCase() === receiver.toLowerCase()),
    );
  }
  entry ??= Object.entries(index.modelMetadata).find(([, m]) =>
    (m.relations ?? []).includes(name),
  );
  if (!entry?.[1].path) return null;
  return { path: entry[1].path, line: entry[1].relationLines?.[name] ?? 0 };
}

function resolveTemplateVar(
  index: AlmasixIndex,
  name: string,
  viewName: string | null | undefined,
): ResolveTarget | null {
  const root = name.split(".")[0] ?? name;
  if (viewName) {
    const entry = index.viewData[viewName]?.[root];
    if (entry?.path) return { path: entry.path, line: entry.line ?? 0 };
  }
  for (const vars of Object.values(index.viewData)) {
    const entry = vars[root];
    if (entry?.path) return { path: entry.path, line: entry.line ?? 0 };
  }
  const shared = index.viewShared[root];
  if (shared?.path) return { path: shared.path, line: shared.line ?? 0 };
  const helper = index.viewHelpers[root];
  if (helper?.path) return { path: helper.path, line: helper.line ?? 0 };
  return null;
}

export function locateNestedKeyLine(filePath: string, segments: string[]): number {
  if (!segments.length) return 0;
  if (!fs.existsSync(filePath)) return 0;
  let lines: string[];
  try {
    lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  } catch {
    return 0;
  }
  let searchFrom = 0;
  let lastLine = 0;
  for (const seg of segments) {
    const pattern = new RegExp(`['"]${escapeRegExp(seg)}['"]\\s*:`);
    let found = false;
    for (let i = searchFrom; i < lines.length; i++) {
      if (pattern.test(lines[i]!)) {
        lastLine = i;
        searchFrom = i + 1;
        found = true;
        break;
      }
    }
    if (!found) break;
  }
  return lastLine;
}

function parseUsedBy(basePath: string, origin: string): ResolveTarget | null {
  const idx = origin.lastIndexOf(":");
  if (idx <= 0) return null;
  const rel = origin.slice(0, idx);
  const lineOneBased = Number.parseInt(origin.slice(idx + 1), 10);
  if (Number.isNaN(lineOneBased)) return null;
  const filePath = basePath ? path.join(basePath, rel) : rel;
  return { path: filePath, line: Math.max(0, lineOneBased - 1) };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const SymbolResolver = { resolve, resolveColumn, locateNestedKeyLine };
export const AlmasixSymbolResolver = SymbolResolver;
