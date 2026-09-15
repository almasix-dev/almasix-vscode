/**
 * Resolve model / table hints to migration columns (and auth().user() → User).
 * Full port of JetBrains AlmasixModelResolver.kt.
 */
import type { AlmasixIndex } from "./types";

export const AUTH_USER_SENTINEL = "__auth_user__";

const SKIP = new Set([
  "DB",
  "Schema",
  "Blueprint",
  "Migration",
  "Path",
  "Model",
  "self",
  "cls",
  "os",
  "re",
  "sys",
  "ast",
  "json",
  // Migration Blueprint parameter — never treat as an Articulate model.
  "table",
  "define",
]);

/** Builder / query chain segments that do not change the model. */
const CHAIN_NOISE = new Set([
  "query",
  "new_query",
  "factory",
  "create",
  "update",
  "fill",
  "force_fill",
  "where",
  "or_where",
  "order_by",
  "order_by_desc",
  "group_by",
  "having",
  "select",
  "add_select",
  "with_",
  "load",
  "load_missing",
  "first",
  "get",
  "find",
  "all",
  "paginate",
  "simple_paginate",
  "limit",
  "offset",
  "take",
  "skip",
  "latest",
  "oldest",
  "pluck",
  "value",
  "count",
  "exists",
  "doesnt_exist",
  "first_or_create",
  "update_or_create",
  "first_or_new",
  "find_or_new",
  "make",
  "save",
  "delete",
  "fresh",
  "refresh",
  "replicate",
]);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isUpperInitial(s: string): boolean {
  return s.length > 0 && s[0]! >= "A" && s[0]! <= "Z";
}

/** Known Articulate model class names from the index. */
export function modelNames(index: AlmasixIndex): Set<string> {
  const fromTables = new Set<string>();
  for (const table of Object.values(index.tables)) {
    if (table.model && table.model.trim()) fromTables.add(table.model);
  }
  return new Set([...fromTables, ...Object.keys(index.modelMetadata)]);
}

/**
 * Strip query/factory chain noise: ``Author.query.where`` → ``Author``,
 * ``AuthorFactory`` → ``Author``.
 */
export function peelModelHint(hint: string): string {
  let head = hint.includes(".") ? (hint.split(".").pop() ?? hint) : hint;
  if (!head) head = hint;
  // Keep leading class when dotted: Author.query → Author
  if (hint.includes(".")) {
    const first = hint.split(".")[0] ?? "";
    if (isUpperInitial(first)) {
      head = first;
    }
  }
  if (head.endsWith("Factory") && head.length > "Factory".length) {
    const model = head.slice(0, -"Factory".length);
    if (isUpperInitial(model)) return model;
  }
  // Drop trailing chain noise if somehow still present as a single token.
  if (CHAIN_NOISE.has(head)) return hint.split(".")[0] ?? hint;
  return head;
}

export function pluralize(singular: string): string {
  const s = singular.toLowerCase();
  if (s.endsWith("y") && s.length > 1 && !"aeiou".includes(s[s.length - 2]!)) {
    return s.slice(0, -1) + "ies";
  }
  if (s.endsWith("s") || s.endsWith("x") || s.endsWith("ch") || s.endsWith("sh")) {
    return s + "es";
  }
  return s + "s";
}

export function authUserModel(index: AlmasixIndex): string {
  for (const table of Object.values(index.tables)) {
    if (table.model && table.model.toLowerCase() === "user") return table.model;
  }
  if (Object.prototype.hasOwnProperty.call(index.modelMetadata, "User")) return "User";
  const loose = Object.keys(index.modelMetadata).find((k) => k.toLowerCase() === "user");
  if (loose) return loose;
  return "User";
}

/** Prefer migration table for [hint] (table name or model class). */
export function resolveTable(
  index: AlmasixIndex,
  hint: string | null | undefined,
): string | null {
  if (hint == null || !hint.trim()) return null;
  const key =
    hint === AUTH_USER_SENTINEL ? authUserModel(index) : peelModelHint(hint);
  if (Object.prototype.hasOwnProperty.call(index.tables, key)) return key;
  for (const [name, table] of Object.entries(index.tables)) {
    if (table.model && table.model.toLowerCase() === key.toLowerCase()) return name;
  }
  const plural = pluralize(isUpperInitial(key) ? key[0]!.toLowerCase() + key.slice(1) : key);
  if (Object.prototype.hasOwnProperty.call(index.tables, plural)) return plural;
  const singular = key.endsWith("s") ? key.slice(0, -1) : key;
  if (Object.prototype.hasOwnProperty.call(index.tables, singular)) return singular;
  const metaEntry = Object.entries(index.modelMetadata).find(
    ([cls, m]) =>
      cls.toLowerCase() === key.toLowerCase() ||
      (m.module ?? "").toLowerCase() === key.toLowerCase(),
  );
  if (metaEntry) {
    const [cls] = metaEntry;
    for (const [name, table] of Object.entries(index.tables)) {
      if (table.model && table.model.toLowerCase() === cls.toLowerCase()) return name;
    }
    const derived = pluralize(
      isUpperInitial(cls) ? cls[0]!.toLowerCase() + cls.slice(1) : cls,
    );
    if (Object.prototype.hasOwnProperty.call(index.tables, derived)) return derived;
  }
  return null;
}

function columnsForResolved(index: AlmasixIndex, model: string): Set<string> {
  const direct = index.modelMetadata[model];
  if (direct) {
    return new Set([
      ...(direct.fillable ?? []),
      ...(direct.guarded ?? []),
      ...(direct.hidden ?? []),
      ...Object.keys(direct.casts ?? {}),
    ]);
  }
  const byModule = Object.entries(index.modelMetadata).find(
    ([, m]) => (m.module ?? "").toLowerCase() === model.toLowerCase(),
  );
  if (byModule) {
    const meta = byModule[1];
    return new Set([
      ...(meta.fillable ?? []),
      ...(meta.guarded ?? []),
      ...(meta.hidden ?? []),
      ...Object.keys(meta.casts ?? {}),
    ]);
  }
  return new Set();
}

/**
 * Columns for a model/table hint: migration schema first, then fillable/casts.
 * Unknown receivers (e.g. Blueprint ``table.``) return empty — never dump every
 * column in the database.
 */
export function columnsFor(
  index: AlmasixIndex,
  hint: string | null | undefined,
): Set<string> {
  if (hint == null || !hint.trim()) return new Set();
  if (hint === AUTH_USER_SENTINEL) {
    return columnsForResolved(index, authUserModel(index));
  }
  const peeled = peelModelHint(hint);
  if (SKIP.has(peeled) || peeled.toLowerCase() === "table") {
    return new Set();
  }
  const tableName = resolveTable(index, hint);
  if (tableName != null) {
    const cols = Object.keys(index.tables[tableName]?.columns ?? {});
    if (cols.length > 0) return new Set(cols);
  }
  return columnsForResolved(index, peeled);
}

/**
 * ``Author.query().where(`` / ``Author.factory().create(`` — last model class
 * that opened a chain ending at the caret.
 */
export function inferChainHead(before: string): string | null {
  const re = /\b([A-Z][A-Za-z0-9_]*)\.(?:query|new_query|factory)\s*\(/g;
  let last: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(before)) !== null) {
    last = m[1] ?? null;
  }
  return last;
}

function inferFromAssignment(before: string, receiver: string): string | null {
  const re = new RegExp(
    `\\b${escapeRegExp(receiver)}\\s*=\\s*(?:await\\s+)?([A-Z][A-Za-z0-9_]*)\\s*(?:\\(|\\.|Factory)`,
    "g",
  );
  let last: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(before)) !== null) {
    last = m[1] ?? null;
  }
  return last;
}

function inferFromFactory(before: string, receiver: string): string | null {
  const factoryCls = new RegExp(
    `\\b${escapeRegExp(receiver)}\\s*=\\s*(?:await\\s+)?([A-Z][A-Za-z0-9_]*)Factory\\s*\\(`,
    "g",
  );
  let last: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = factoryCls.exec(before)) !== null) {
    last = m[1] ?? null;
  }
  if (last) return last;
  const modelFactory = new RegExp(
    `\\b${escapeRegExp(receiver)}\\s*=\\s*(?:await\\s+)?([A-Z][A-Za-z0-9_]*)\\s*\\.\\s*factory\\s*\\(`,
    "g",
  );
  while ((m = modelFactory.exec(before)) !== null) {
    last = m[1] ?? null;
  }
  return last;
}

function inferFromAnnotation(before: string, receiver: string): string | null {
  const re = new RegExp(
    `\\b${escapeRegExp(receiver)}\\s*:\\s*(?:Optional\\[)?([A-Z][A-Za-z0-9_]*)`,
    "g",
  );
  let last: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(before)) !== null) {
    last = m[1] ?? null;
  }
  return last;
}

/**
 * Infer model class for a simple receiver name using text before the caret
 * (annotations / assignments) plus ``user`` → ``User`` heuristic.
 */
export function inferModel(
  index: AlmasixIndex,
  beforeCaret: string,
  receiver: string,
): string | null {
  if (!receiver.trim() || SKIP.has(receiver)) return null;
  if (receiver === AUTH_USER_SENTINEL) return authUserModel(index);
  const models = modelNames(index);
  const peeled = peelModelHint(receiver);
  if (isUpperInitial(peeled) && (models.size === 0 || models.has(peeled))) {
    return peeled;
  }
  if (peeled !== receiver && models.has(peeled)) return peeled;

  const inferred =
    inferFromAssignment(beforeCaret, receiver) ??
    inferFromAnnotation(beforeCaret, receiver) ??
    inferFromFactory(beforeCaret, receiver) ??
    inferChainHead(beforeCaret);
  if (inferred != null) {
    const model = peelModelHint(inferred);
    if (models.size === 0 || models.has(model)) return model;
  }
  const camel = receiver
    .split("_")
    .map((part) => (part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join("");
  if (models.has(camel)) return camel;
  if (
    receiver.toLowerCase() === "user" &&
    [...models].some((m) => m.toLowerCase() === "user")
  ) {
    return authUserModel(index);
  }
  return null;
}

export const ModelResolver = {
  AUTH_USER_SENTINEL,
  SKIP,
  CHAIN_NOISE,
  modelNames,
  peelModelHint,
  pluralize,
  authUserModel,
  resolveTable,
  columnsFor,
  inferModel,
  inferChainHead,
};

export const AlmasixModelResolver = ModelResolver;
