import { CompletionCatalog } from "./completionCatalog";
import type { AlmasixIndex } from "./types";

/**
 * Articulate / ORM helper snippets and suggestions (Laravel Idea–style).
 */
export interface ArticulateSnippet {
  label: string;
  template: string;
  detail: string;
}

export const ArticulateHelpers = {
  /** `Post.with_("comments")` / `load` / `load_missing` suggestions for a model. */
  eagerLoadSnippets(
    index: AlmasixIndex,
    receiver: string | null | undefined,
  ): ArticulateSnippet[] {
    const rels = [...CompletionCatalog.relationsFor(index, receiver)].sort();
    if (rels.length === 0) return [];
    const recv = receiver
      ? receiver.includes(".")
        ? (receiver.split(".").pop() ?? "Model")
        : receiver
      : "Model";
    return rels.flatMap((rel) => [
      {
        label: `${recv}.with_("${rel}")`,
        template: `${recv}.with_("${rel}")`,
        detail: "eager load",
      },
      {
        label: `${recv}.load("${rel}")`,
        template: `${recv}.load("${rel}")`,
        detail: "lazy eager load",
      },
    ]);
  },

  /** `where("email", …)` column helpers. */
  whereColumnSnippets(
    index: AlmasixIndex,
    receiver: string | null | undefined,
  ): ArticulateSnippet[] {
    const cols = [...CompletionCatalog.columnsFor(index, receiver)].sort();
    const recv = receiver
      ? receiver.includes(".")
        ? (receiver.split(".").pop() ?? "query")
        : receiver
      : "query";
    return cols.map((col) => ({
      label: `${recv}.where("${col}", …)`,
      template: `${recv}.where("${col}", $value)`,
      detail: "column",
    }));
  },

  relationMethodStub(relationName: string, relatedModel = "Related"): string {
    return [
      `def ${relationName}(self):`,
      `    return self.has_many(${relatedModel})`,
    ].join("\n");
  },
};

export const AlmasixArticulateHelpers = ArticulateHelpers;
