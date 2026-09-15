import { ArticulateHelpers } from "./articulateHelpers";

/**
 * Insert an Articulate relation method into a model source buffer.
 */
export interface RelationStubEdit {
  startOffset: number;
  endOffset: number;
  newText: string;
}

export interface RelationStubPlan {
  edits: RelationStubEdit[];
  refusal: string | null;
  readonly isAllowed: boolean;
}

function makePlan(
  edits: RelationStubEdit[] = [],
  refusal: string | null = null,
): RelationStubPlan {
  return {
    edits,
    refusal,
    get isAllowed() {
      return this.refusal == null && this.edits.length > 0;
    },
  };
}

export const RelationStubPlanner = {
  /**
   * Append [relationName] method before the closing of the last top-level class,
   * or at EOF if no class body can be located.
   */
  planInsert(
    modelSource: string,
    relationName: string,
    relatedModel = "Related",
  ): RelationStubPlan {
    const name = relationName.trim();
    if (!name || !/^[A-Za-z_][\w]*$/.test(name)) {
      return makePlan([], "Invalid relation name");
    }
    if (new RegExp(`\\bdef\\s+${escapeRegExp(name)}\\s*\\(`).test(modelSource)) {
      return makePlan([], "Method already exists");
    }
    const stub = ArticulateHelpers.relationMethodStub(name, relatedModel);
    const insertAt = findClassInsertOffset(modelSource);
    if (insertAt == null) {
      return makePlan([
        {
          startOffset: modelSource.length,
          endOffset: modelSource.length,
          newText: `\n\n${stub}\n`,
        },
      ]);
    }
    const indent = "    ";
    const indented = stub
      .split("\n")
      .map((line) => (line.trim() === "" ? "" : indent + line))
      .join("\n");
    const prefix =
      insertAt > 0 && modelSource[insertAt - 1] !== "\n" ? "\n" : "";
    const block = `${prefix}\n${indented}\n`;
    return makePlan([{ startOffset: insertAt, endOffset: insertAt, newText: block }]);
  },

  applyToText(text: string, edits: RelationStubEdit[]): string {
    let result = text;
    for (const edit of [...edits].sort((a, b) => b.startOffset - a.startOffset)) {
      result =
        result.slice(0, edit.startOffset) + edit.newText + result.slice(edit.endOffset);
    }
    return result;
  },

  findClassInsertOffset,
};

/** Offset just before the final dedent that closes the last `class` body. */
function findClassInsertOffset(source: string): number | null {
  const classRe = /^class\s+[A-Z][A-Za-z0-9_]*\b/gm;
  let classMatch: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = classRe.exec(source)) !== null) {
    classMatch = m;
  }
  if (!classMatch) return null;
  const afterClass = classMatch.index + classMatch[0].length;
  let i = afterClass;
  let sawBody = false;
  while (i < source.length) {
    const lineStart = i;
    while (i < source.length && source[i] !== "\n") i++;
    const line = source.slice(lineStart, i);
    if (line.trim() !== "") {
      let indent = 0;
      while (indent < line.length && (line[indent] === " " || line[indent] === "\t")) {
        indent++;
      }
      if (indent === 0 && sawBody && !line.trimStart().startsWith("#")) {
        return lineStart;
      }
      if (indent > 0) sawBody = true;
    }
    if (i < source.length && source[i] === "\n") i++;
  }
  return sawBody ? source.length : null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const AlmasixRelationStubPlanner = RelationStubPlanner;
