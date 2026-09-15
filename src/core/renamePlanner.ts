import type { Occurrence } from "./callSiteSearcher";
import { CallSiteSearcher } from "./callSiteSearcher";
import { CodeActionPlanner } from "./codeActionPlanner";
import { SymbolKind } from "./types";

/**
 * Safe rename planning for Almasix string symbols (routes, views, config keys,
 * components, env keys).
 */
export interface RenameEdit {
  /** Absolute path, or empty for in-memory / single-buffer plans. */
  path: string;
  startOffset: number;
  endOffset: number;
  newText: string;
}

export interface FileMove {
  fromPath: string;
  toPath: string;
}

export interface RenamePlan {
  kind: SymbolKind;
  oldName: string;
  newName: string;
  edits: RenameEdit[];
  /** Optional filesystem moves (view / component templates). */
  fileMoves: FileMove[];
  /** Human-readable reason when edits is empty / rename refused. */
  refusal: string | null;
  readonly isEmpty: boolean;
  readonly isAllowed: boolean;
}

function makePlan(
  kind: SymbolKind,
  oldName: string,
  newName: string,
  edits: RenameEdit[],
  fileMoves: FileMove[] = [],
  refusal: string | null = null,
): RenamePlan {
  return {
    kind,
    oldName,
    newName,
    edits,
    fileMoves,
    refusal,
    get isEmpty() {
      return this.edits.length === 0 && this.fileMoves.length === 0;
    },
    get isAllowed() {
      return this.refusal == null && (this.edits.length > 0 || this.fileMoves.length > 0);
    },
  };
}

const ROUTE_NAME = /^[A-Za-z_][\w.-]*$/;
const VIEW_NAME = /^[A-Za-z_][\w./-]*$/;
const CONFIG_KEY = /^[A-Za-z_][\w.]*$/;
const ENV_KEY = /^[A-Z][A-Z0-9_]*$/;

export const RenamePlanner = {
  /** Kinds that support Rename safely via call-site text edits. */
  RENAMABLE: new Set([
    SymbolKind.ROUTE,
    SymbolKind.VIEW,
    SymbolKind.CONFIG,
    SymbolKind.COMPONENT,
    SymbolKind.ENV,
  ]),

  validateNewName(kind: SymbolKind, newName: string): string | null {
    const trimmed = newName.trim();
    if (trimmed.length === 0) return "Name cannot be empty";
    if (trimmed !== newName) return "Name cannot have leading/trailing whitespace";
    if (trimmed.includes("\n") || trimmed.includes("\r")) return "Name cannot contain newlines";
    switch (kind) {
      case SymbolKind.ROUTE:
        return ROUTE_NAME.test(trimmed)
          ? null
          : "Route names must be dotted identifiers (e.g. dashboard, teams.show)";
      case SymbolKind.VIEW:
      case SymbolKind.COMPONENT:
        return VIEW_NAME.test(trimmed)
          ? null
          : "View/component names must be dotted path segments (e.g. auth.login)";
      case SymbolKind.CONFIG:
        return CONFIG_KEY.test(trimmed)
          ? null
          : "Config keys must be dotted identifiers (e.g. app.env)";
      case SymbolKind.ENV:
        return ENV_KEY.test(trimmed)
          ? null
          : "Env keys must be SCREAMING_SNAKE_CASE identifiers";
      default:
        return `Rename is not supported for ${kind.toLowerCase()}`;
    }
  },

  /**
   * Build a rename plan from already-discovered call-site occurrences.
   * Occurrences are replaced left-to-right within each path (descending offset
   * order so offsets stay valid when applied sequentially).
   */
  planFromOccurrences(
    kind: SymbolKind,
    oldName: string,
    newName: string,
    occurrences: Occurrence[],
    fileMoves: FileMove[] = [],
    definitionEdits: RenameEdit[] = [],
  ): RenamePlan {
    const reason = RenamePlanner.validateNewName(kind, newName);
    if (reason) {
      return makePlan(kind, oldName, newName, [], [], reason);
    }
    if (oldName === newName) {
      return makePlan(kind, oldName, newName, [], [], "Name unchanged");
    }
    const callEdits = occurrences.map((occ) => ({
      path: occ.path,
      startOffset: occ.range.startOffset,
      endOffset: occ.range.endOffset,
      newText: newName,
    }));
    const edits = [...callEdits, ...definitionEdits].sort((a, b) => {
      if (a.path < b.path) return -1;
      if (a.path > b.path) return 1;
      return b.startOffset - a.startOffset;
    });
    if (edits.length === 0 && fileMoves.length === 0) {
      return makePlan(kind, oldName, newName, [], [], "No usages found");
    }
    return makePlan(kind, oldName, newName, edits, fileMoves);
  },

  /**
   * Map a view/component dotted name rename onto a template file move when the
   * index knows the source path.
   */
  planViewFileMove(
    kind: SymbolKind,
    _oldName: string,
    newName: string,
    indexedPath: string | null | undefined,
    basePath: string,
  ): FileMove | null {
    if (kind !== SymbolKind.VIEW && kind !== SymbolKind.COMPONENT) return null;
    if (indexedPath == null || !indexedPath.trim()) return null;
    const to =
      kind === SymbolKind.VIEW
        ? CodeActionPlanner.viewPathForName(basePath, newName)
        : CodeActionPlanner.componentPathForName(basePath, newName);
    if (indexedPath.replace(/\\/g, "/") === to.replace(/\\/g, "/")) return null;
    return { fromPath: indexedPath, toPath: to };
  },

  /**
   * Rewrite the leaf dict key in a config module for ``app.env`` → ``app.environment``.
   * [line] is 0-based; when unknown, searches the whole buffer for a safe match.
   */
  planConfigKeyDefinition(
    configText: string,
    configPath: string,
    oldKey: string,
    newKey: string,
    line = -1,
  ): RenameEdit[] {
    if (oldKey === newKey) return [];
    const oldLeaf = oldKey.includes(".")
      ? oldKey.slice(oldKey.lastIndexOf(".") + 1)
      : oldKey;
    const newLeaf = newKey.includes(".")
      ? newKey.slice(newKey.lastIndexOf(".") + 1)
      : newKey;
    if (!oldLeaf || !newLeaf || oldLeaf === newLeaf) {
      return [];
    }
    const lines = configText.split("\n");
    const candidates =
      line >= 0 && line < lines.length ? [line] : lines.map((_, i) => i);
    for (const li of candidates) {
      const row = lines[li]!;
      const quoteMatch = new RegExp(`(['"])${escapeRegExp(oldLeaf)}\\1\\s*:`).exec(row);
      if (!quoteMatch || quoteMatch.index === undefined) continue;
      const lineStart = lines.slice(0, li).reduce((sum, l) => sum + l.length + 1, 0);
      const keyStart = lineStart + quoteMatch.index + 1; // skip opening quote
      const keyEnd = keyStart + oldLeaf.length;
      return [
        {
          path: configPath,
          startOffset: keyStart,
          endOffset: keyEnd,
          newText: newLeaf,
        },
      ];
    }
    return [];
  },

  /**
   * Apply [edits] that target a single in-memory buffer (paths ignored / matched).
   * Edits must be sorted descending by startOffset.
   */
  applyToText(text: string, edits: RenameEdit[]): string {
    let result = text;
    const ordered = [...edits].sort((a, b) => b.startOffset - a.startOffset);
    for (const edit of ordered) {
      if (
        edit.startOffset < 0 ||
        edit.startOffset > result.length ||
        edit.endOffset < edit.startOffset ||
        edit.endOffset > result.length
      ) {
        throw new Error(
          `Edit out of range: ${edit.startOffset}-${edit.endOffset} for length ${result.length}`,
        );
      }
      result =
        result.slice(0, edit.startOffset) + edit.newText + result.slice(edit.endOffset);
    }
    return result;
  },

  /**
   * Convenience: scan [text] for [oldName] call sites and return the rewritten buffer.
   */
  rewriteText(
    text: string,
    kind: SymbolKind,
    oldName: string,
    newName: string,
    dotenvFile = false,
  ): RenamePlan {
    const occ = CallSiteSearcher.findInText(text, kind, oldName, dotenvFile);
    const plan = RenamePlanner.planFromOccurrences(kind, oldName, newName, occ);
    if (!plan.isAllowed) return plan;
    const rewritten = RenamePlanner.applyToText(text, plan.edits);
    return makePlan(kind, oldName, newName, [
      { path: "", startOffset: 0, endOffset: text.length, newText: rewritten },
    ]);
  },
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const AlmasixRenamePlanner = RenamePlanner;
