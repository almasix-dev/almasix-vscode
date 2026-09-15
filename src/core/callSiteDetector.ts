/**
 * Detect which Almasix string / attribute surface the caret is inside.
 * Full port of JetBrains CallSiteDetector.kt.
 */
import { ModelResolver } from "./modelResolver";
import { SymbolKind } from "./types";

export interface CallSite {
  kind: SymbolKind;
  prefix: string;
  /** Model / table hint for columns / relations; env key for ENV_VALUE. */
  receiver?: string | null;
  /** True when completing a pipe-segment of a validation rule string. */
  validationSegment?: boolean;
}

export type Site = CallSite;

const COLUMN_FNS =
  "where_not_between|where_between|where_json_contains|where_json_length|" +
  "where_not_null|where_not_in|where_null|where_date|where_time|where_day|" +
  "where_month|where_year|where_not|where_in|or_where|where|" +
  "order_by_desc|order_by|group_by|having_between|having|" +
  "add_select|select|pluck|value|increment|decrement|" +
  "sum|avg|max|min|latest|oldest|only|except|update|create|" +
  "first_or_create|update_or_create|first_or_new|find_or_new|" +
  "fill|force_fill";

const RELATION_FNS = "with_|load|load_missing|has|where_has|or_where_has|doesnt_have";

const METHOD_CALL = new RegExp(
  `(?<recv>\\b[A-Za-z_][\\w]*(?:\\.[A-Za-z_][\\w]*)*)\\.(?<fn>route|route_is|view|config|__|trans|env|can|authorize|middleware|disk|render|${RELATION_FNS}|${COLUMN_FNS}|table|vite|asset|url)\\s*\\(\\s*(?<q>['"])(?<pre>[^'"]*)$`,
  "i",
);

const GLOBAL_CALL = new RegExp(
  `(?<![.\\w])(?<fn>route|route_is|view|config|__|trans|env|can|authorize|middleware|disk|render|vite|asset|url)\\s*\\(\\s*(?<q>['"])(?<pre>[^'"]*)$`,
  "i",
);

const CHAINED_CALL = new RegExp(
  `\\)\\.(?<fn>route|route_is|view|config|__|trans|env|can|authorize|middleware|disk|render|${RELATION_FNS}|${COLUMN_FNS}|table|vite|asset|url)\\s*\\(\\s*(?<q>['"])(?<pre>[^'"]*)$`,
  "i",
);

const ENV_DEFAULT =
  /\benv\s*\(\s*(['"])(?<key>[A-Za-z_][\w]*)\1\s*,\s*(?:(['"])(?<pre>[^'"]*)|(?<bare>[A-Za-z_][\w.]*)?)?$/;

const DIRECTIVE_VIEW =
  /@(?:extends|include|includeIf|includeWhen|includeUnless|each|component|lang|choice|can|cannot|canany|cannotany|route|signedRoute|asset|vite)\s*\(\s*(?<q>['"])(?<pre>[^'"]*)$/;

const AT_DIRECTIVE = /@(?<pre>[A-Za-z_][\w]*)?$/;

const COMPONENT_TAG = /<x-(?<pre>[\w./-]*)$/;

const DOTENV_INTERPOLATION = /\$\{(?<pre>[A-Za-z_][\w]*)?$/;

const DOTENV_VALUE = /^\s*(?:export\s+)?(?<key>[A-Za-z_][\w]*)\s*=\s*(?<pre>[^#]*)$/;

const DOTENV_KEY = /^\s*(?:export\s+)?(?<pre>[A-Za-z_][\w]*)?$/;

const VALIDATION = /(?<fn>validate|rules)\s*\([^)]*?(?:['"])(?<pre>[^'"]*)$/i;

const CASTS_VALUE = /casts\s*=\s*\{[^}]*['"][^'"]+['"]\s*:\s*['"](?<pre>[^'"]*)$/;

const CASTS_KEY =
  /casts\s*=\s*\{(?:[^}'"]*(?:['"][^'"]*['"]\s*:\s*['"][^'"]*['"]\s*,\s*)*)\s*['"](?<pre>[^'"]*)$/;

const MODEL_LIST =
  /\b(?<attr>fillable|guarded|hidden|appends)\s*=\s*(?:\[|\()\s*(?:(?:['"][^'"]*['"])\s*,\s*)*['"](?<pre>[^'"]*)$/;

const ATTR =
  /(?:auth\s*\(\s*\)(?:\s*\.\s*guard\s*\([^)]*\))?\s*\.\s*user\s*\(\s*\)|request\s*\.\s*user\s*\(\s*\)|(?<recv>[A-Za-z_][\w]*))\.(?<pre>[A-Za-z_][\w]*)?$/;

const CONTROLLER_ACTION = /\[\s*[A-Za-z_][\w.]*\s*,\s*(?<q>['"])(?<pre>[^'"]*)$/;

const SMITH = /(?:Artisan::call|Smith\.call|call)\s*\(\s*(?<q>['"])(?<pre>[^'"]*)$/;

const MUTATOR_FNS =
  "create|update|fill|force_fill|first_or_create|update_or_create|first_or_new|find_or_new";

const KWARG_COLUMN = new RegExp(
  `(?<recv>\\b[A-Za-z_][\\w]*(?:\\.[A-Za-z_][\\w]*)*)\\.(?<fn>${MUTATOR_FNS})\\s*\\(\\s*(?:.*,\\s*)?(?<pre>[A-Za-z_][\\w]*)?\\s*=?\\s*$`,
  "i",
);

const DICT_COLUMN = new RegExp(
  `(?<recv>\\b[A-Za-z_][\\w]*(?:\\.[A-Za-z_][\\w]*)*)\\.(?<fn>${MUTATOR_FNS})\\s*\\(\\s*\\{(?:[^}'"]*(?:['"][^'"]*['"]\\s*:\\s*[^,}]+,?\\s*)*)\\s*['"](?<pre>[^'"]*)$`,
  "i",
);

const MODEL_QUERY_CHAIN = new RegExp(
  `(?<recv>\\b[A-Z][A-Za-z0-9_]*)\\.(?:query|new_query|factory)\\s*\\([^)]*\\)(?:\\s*\\.\\s*[A-Za-z_][\\w]*\\s*\\([^)]*\\))*\\s*\\.\\s*(?<fn>${RELATION_FNS}|${COLUMN_FNS})\\s*\\(\\s*(?<q>['"])(?<pre>[^'"]*)$`,
  "i",
);

const COLUMN_FN_SET = new Set(COLUMN_FNS.split("|").map((s) => s.toLowerCase()));
const RELATION_FN_SET = new Set(RELATION_FNS.split("|").map((s) => s.toLowerCase()));
const CALL_MATCHERS = [METHOD_CALL, CHAINED_CALL, GLOBAL_CALL];

function named(m: RegExpMatchArray, name: string): string | undefined {
  return m.groups?.[name];
}

function kindForCall(fn: string): SymbolKind | null {
  switch (fn) {
    case "route":
    case "route_is":
      return SymbolKind.ROUTE;
    case "view":
      return SymbolKind.VIEW;
    case "config":
      return SymbolKind.CONFIG;
    case "__":
    case "trans":
      return SymbolKind.TRANSLATION;
    case "env":
      return SymbolKind.ENV;
    case "can":
    case "authorize":
      return SymbolKind.GATE;
    case "middleware":
      return SymbolKind.MIDDLEWARE;
    case "disk":
      return SymbolKind.DISK;
    case "render":
      return SymbolKind.INERTIA;
    case "table":
      return SymbolKind.TABLE;
    case "vite":
    case "asset":
    case "url":
      return SymbolKind.VITE;
    default:
      if (RELATION_FN_SET.has(fn)) return SymbolKind.RELATION;
      if (COLUMN_FN_SET.has(fn)) return SymbolKind.COLUMN;
      return null;
  }
}

function stripDotenvValuePrefix(raw: string): string {
  const text = raw.trimStart();
  if (text.length === 0) return "";
  if (text[0] === '"' || text[0] === "'") {
    const q = text[0];
    if (text.length === 1) return "";
    return text[text.length - 1] === q ? text.slice(1, -1) : text.slice(1);
  }
  return text;
}

function detectDotenvLine(line: string): CallSite | null {
  if (line.trimStart().startsWith("#")) return null;
  {
    const m = line.match(DOTENV_INTERPOLATION);
    if (m) return { kind: SymbolKind.ENV, prefix: named(m, "pre") ?? "" };
  }
  {
    const m = line.match(DOTENV_VALUE);
    if (m) {
      return {
        kind: SymbolKind.ENV_VALUE,
        prefix: stripDotenvValuePrefix(named(m, "pre") ?? ""),
        receiver: named(m, "key"),
      };
    }
  }
  {
    const m = line.match(DOTENV_KEY);
    if (m) return { kind: SymbolKind.ENV, prefix: named(m, "pre") ?? "" };
  }
  return null;
}

/**
 * @param dotenvFile when true, also match bare ``KEY`` / ``KEY=value`` lines
 *   (only safe inside ``.env`` / ``.env.*`` files).
 */
export function detect(beforeCaret: string, dotenvFile = false): CallSite | null {
  if (dotenvFile) {
    const lastNl = beforeCaret.lastIndexOf("\n");
    const line = lastNl >= 0 ? beforeCaret.slice(lastNl + 1) : beforeCaret;
    const dotenv = detectDotenvLine(line);
    if (dotenv) return dotenv;
  }

  const text = beforeCaret.replace(/\n/g, " ");
  const tail = text.length > 320 ? text.slice(-320) : text;

  {
    const m = tail.match(DOTENV_INTERPOLATION);
    if (m) return { kind: SymbolKind.ENV, prefix: named(m, "pre") ?? "" };
  }
  {
    const m = tail.match(ENV_DEFAULT);
    if (m) {
      return {
        kind: SymbolKind.ENV_VALUE,
        prefix: named(m, "pre") ?? named(m, "bare") ?? "",
        receiver: named(m, "key"),
      };
    }
  }
  {
    const m = tail.match(COMPONENT_TAG);
    if (m) return { kind: SymbolKind.COMPONENT, prefix: named(m, "pre") ?? "" };
  }
  {
    const m = tail.match(AT_DIRECTIVE);
    if (m) {
      if (!tail.includes("(") || tail.lastIndexOf("@") > tail.lastIndexOf("(")) {
        return { kind: SymbolKind.DIRECTIVE, prefix: named(m, "pre") ?? "" };
      }
    }
  }
  {
    const m = tail.match(DIRECTIVE_VIEW);
    if (m) {
      const name = m[0].slice(m[0].indexOf("@") + 1).split("(")[0]!.trim();
      let kind: SymbolKind;
      switch (name) {
        case "extends":
        case "include":
        case "includeIf":
        case "includeWhen":
        case "includeUnless":
        case "each":
          kind = SymbolKind.VIEW;
          break;
        case "component":
          kind = SymbolKind.COMPONENT;
          break;
        case "lang":
        case "choice":
          kind = SymbolKind.TRANSLATION;
          break;
        case "can":
        case "cannot":
        case "canany":
        case "cannotany":
          kind = SymbolKind.GATE;
          break;
        case "route":
        case "signedRoute":
          kind = SymbolKind.ROUTE;
          break;
        case "asset":
        case "vite":
          kind = SymbolKind.VITE;
          break;
        default:
          kind = SymbolKind.VIEW;
      }
      return { kind, prefix: named(m, "pre") ?? "" };
    }
  }
  {
    const m = tail.match(CASTS_VALUE);
    if (m) return { kind: SymbolKind.CAST, prefix: named(m, "pre") ?? "" };
  }
  {
    const m = tail.match(CASTS_KEY);
    if (m) {
      return {
        kind: SymbolKind.MODEL_ATTR,
        prefix: named(m, "pre") ?? "",
        receiver: "casts",
      };
    }
  }
  {
    const m = tail.match(MODEL_LIST);
    if (m) {
      return {
        kind: SymbolKind.MODEL_ATTR,
        prefix: named(m, "pre") ?? "",
        receiver: named(m, "attr"),
      };
    }
  }
  {
    const m = tail.match(CONTROLLER_ACTION);
    if (m) return { kind: SymbolKind.CONTROLLER_ACTION, prefix: named(m, "pre") ?? "" };
  }
  {
    const m = tail.match(SMITH);
    if (m) return { kind: SymbolKind.SMITH, prefix: named(m, "pre") ?? "" };
  }
  {
    const m = tail.match(VALIDATION);
    if (m) {
      const pre = named(m, "pre") ?? "";
      const segment = pre.includes("|") ? pre.slice(pre.lastIndexOf("|") + 1) : pre;
      return {
        kind: SymbolKind.VALIDATION,
        prefix: pre.includes("|") ? segment : pre,
        validationSegment: pre.includes("|"),
      };
    }
  }
  {
    const m = tail.match(KWARG_COLUMN);
    if (m) {
      return {
        kind: SymbolKind.COLUMN,
        prefix: named(m, "pre") ?? "",
        receiver: named(m, "recv"),
      };
    }
  }
  {
    const m = tail.match(DICT_COLUMN);
    if (m) {
      return {
        kind: SymbolKind.COLUMN,
        prefix: named(m, "pre") ?? "",
        receiver: named(m, "recv"),
      };
    }
  }
  {
    const m = tail.match(MODEL_QUERY_CHAIN);
    if (m) {
      const fn = (named(m, "fn") ?? "").toLowerCase();
      const kind = kindForCall(fn);
      if (kind) {
        return { kind, prefix: named(m, "pre") ?? "", receiver: named(m, "recv") };
      }
    }
  }
  for (const regex of CALL_MATCHERS) {
    const m = tail.match(regex);
    if (!m) continue;
    const fn = (named(m, "fn") ?? "").toLowerCase();
    const pre = named(m, "pre") ?? "";
    let recv = named(m, "recv");
    const kind = kindForCall(fn);
    if (!kind) continue;
    if (recv == null && (kind === SymbolKind.COLUMN || kind === SymbolKind.RELATION)) {
      recv = ModelResolver.inferChainHead(tail) ?? undefined;
    }
    return { kind, prefix: pre, receiver: recv };
  }
  {
    const m = tail.match(ATTR);
    if (m) {
      const pre = named(m, "pre") ?? "";
      let recv: string | undefined;
      if (m[0].includes("auth") && m[0].includes("user")) {
        recv = ModelResolver.AUTH_USER_SENTINEL;
      } else if (m[0].includes("request") && m[0].includes("user")) {
        recv = ModelResolver.AUTH_USER_SENTINEL;
      } else {
        recv = named(m, "recv");
      }
      if (recv != null && !["route", "view", "config", "env"].includes(recv)) {
        return { kind: SymbolKind.ATTR, prefix: pre, receiver: recv };
      }
    }
  }
  {
    const m = tail.match(/\{(?:\{|!!)\s*(?<pre>[A-Za-z_][\w.]*)?$/);
    if (m) return { kind: SymbolKind.TEMPLATE_VAR, prefix: named(m, "pre") ?? "" };
  }
  return null;
}

export const CallSiteDetector = { detect };
