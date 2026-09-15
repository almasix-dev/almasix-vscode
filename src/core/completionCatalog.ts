/**
 * Pure completion catalog — driven by AlmasixIndex + modelResolver.
 */
import type { CallSite } from "./callSiteDetector";
import type { AlmasixIndex } from "./types";
import { SymbolKind } from "./types";
import * as modelResolver from "./modelResolver";

export type CompletionPair = [label: string, detail: string];

export function symbolsFor(
  index: AlmasixIndex,
  site: CallSite,
  beforeCaret = "",
): CompletionPair[] {
  switch (site.kind) {
    case SymbolKind.ROUTE:
      return Object.entries(index.routes).map(([n, r]) => [
        n,
        `${r.methods.join("|")} ${r.uri}`,
      ]);
    case SymbolKind.VIEW:
      return Object.keys(index.views).map((n) => [n, "view"]);
    case SymbolKind.CONFIG:
      return [...index.configKeys].map((n) => [n, "config"]);
    case SymbolKind.TRANSLATION:
      return [...index.translationKeys].map((n) => [n, "trans"]);
    case SymbolKind.MIDDLEWARE:
      return [...index.middlewareAliases].map((n) => [n, "middleware"]);
    case SymbolKind.ENV:
      return Object.entries(index.envKeys).map(([n, e]) => [n, e.detail || "env"]);
    case SymbolKind.ENV_VALUE: {
      const key = site.receiver;
      if (!key) return [];
      return index.optionsForEnvKey(key).map((n) => [n, `${key} option`]);
    }
    case SymbolKind.TABLE:
      return Object.entries(index.tables).map(([n, t]) => [n, t.detail || "table"]);
    case SymbolKind.COLUMN:
    case SymbolKind.MODEL_ATTR:
    case SymbolKind.ATTR: {
      const hint = resolveHint(index, site, beforeCaret);
      return [...modelResolver.columnsFor(index, hint)].map((c) => [
        c,
        columnDetail(index, hint),
      ]);
    }
    case SymbolKind.RELATION: {
      const hint = resolveHint(index, site, beforeCaret);
      return [...relationsFor(index, hint)].map((r) => [r, "relation"]);
    }
    case SymbolKind.CAST:
      return [...index.casts].map((n) => [n, "cast"]);
    case SymbolKind.GATE:
      return [...index.gates].map((n) => [n, "gate"]);
    case SymbolKind.COMPONENT:
      return Object.keys(index.components).map((n) => [n, "component"]);
    case SymbolKind.VALIDATION:
      return [...index.validationRules].map((n) => [n, "rule"]);
    case SymbolKind.DISK:
      return [...index.disks].map((n) => [n, "disk"]);
    case SymbolKind.QUEUE:
      return [...index.queues].map((n) => [n, "queue"]);
    case SymbolKind.CACHE:
      return [...index.caches].map((n) => [n, "cache"]);
    case SymbolKind.MAILER:
      return [...index.mailers].map((n) => [n, "mailer"]);
    case SymbolKind.INERTIA:
      return [...index.inertiaPages].map((n) => [n, "inertia"]);
    case SymbolKind.SMITH:
      return [...index.smithCommands].map((n) => [n, "smith"]);
    case SymbolKind.VITE:
      return [...Object.keys(index.viteEntries), ...Object.keys(index.views)].map((n) => [
        n,
        "asset",
      ]);
    case SymbolKind.DIRECTIVE:
      return [...index.directives].map((n) => [n, "directive"]);
    case SymbolKind.TEMPLATE_VAR:
      return [...index.templateVarNames()].map((n) => [n, "var"]);
    case SymbolKind.CONTROLLER_ACTION:
      return [...new Set(Object.values(index.controllerActions).flat())].map((n) => [n, "action"]);
    default:
      return [];
  }
}

function resolveHint(
  index: AlmasixIndex,
  site: CallSite,
  beforeCaret: string,
): string | null {
  const raw = site.receiver ?? null;
  if (raw == null) return null;
  if (raw === modelResolver.AUTH_USER_SENTINEL) return modelResolver.AUTH_USER_SENTINEL;
  if (site.kind === SymbolKind.MODEL_ATTR) {
    const m = [...beforeCaret.matchAll(/class\s+([A-Z][A-Za-z0-9_]*)\s*[:(]/g)].pop();
    if (m) return m[1]!;
  }
  return modelResolver.inferModel(index, beforeCaret, raw) ?? modelResolver.peelModelHint(raw);
}

function columnDetail(index: AlmasixIndex, hint: string | null): string {
  const table = modelResolver.resolveTable(index, hint);
  return table ? `column · ${table}` : "column";
}

export function relationsFor(index: AlmasixIndex, receiver: string | null | undefined): Set<string> {
  if (receiver) {
    const hint =
      receiver === modelResolver.AUTH_USER_SENTINEL
        ? modelResolver.authUserModel(index)
        : receiver.includes(".")
          ? receiver.slice(receiver.lastIndexOf(".") + 1)
          : receiver;
    if (hint && index.relations[hint]) return new Set(index.relations[hint]);
    if (hint && index.modelMetadata[hint]?.relations) {
      return new Set(index.modelMetadata[hint]!.relations);
    }
    for (const [cls, m] of Object.entries(index.modelMetadata)) {
      if (
        hint &&
        (cls.toLowerCase() === hint.toLowerCase() || m.module?.toLowerCase() === hint.toLowerCase())
      ) {
        return new Set(m.relations ?? []);
      }
    }
  }
  return new Set(Object.values(index.relations).flat());
}

export const CompletionCatalog = { symbolsFor, relationsFor, columnsFor: modelResolver.columnsFor };
export const AlmasixCompletionCatalog = CompletionCatalog;
