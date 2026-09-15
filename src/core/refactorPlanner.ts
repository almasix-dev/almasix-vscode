import { CodeActionPlanner } from "./codeActionPlanner";

/**
 * Pure refactor plans: extract Prism partial, convert ``@include`` → component.
 */
export interface RefactorEdit {
  startOffset: number;
  endOffset: number;
  newText: string;
}

export interface RefactorPlan {
  title: string;
  createPath: string | null;
  createContent: string | null;
  edits: RefactorEdit[];
  refusal: string | null;
  readonly isAllowed: boolean;
}

function makePlan(partial: {
  title: string;
  createPath?: string | null;
  createContent?: string | null;
  edits?: RefactorEdit[];
  refusal?: string | null;
}): RefactorPlan {
  const edits = partial.edits ?? [];
  const createPath = partial.createPath ?? null;
  const refusal = partial.refusal ?? null;
  return {
    title: partial.title,
    createPath,
    createContent: partial.createContent ?? null,
    edits,
    refusal,
    get isAllowed() {
      return this.refusal == null && (this.edits.length > 0 || this.createPath != null);
    },
  };
}

export const RefactorPlanner = {
  extractPartial(
    basePath: string,
    selection: string,
    selectionStart: number,
    selectionEnd: number,
    dottedName: string,
  ): RefactorPlan {
    const name = dottedName.trim();
    if (!name) return makePlan({ title: "Extract partial", refusal: "Name required" });
    if (!/^[A-Za-z_][\w./-]*$/.test(name)) {
      return makePlan({ title: "Extract partial", refusal: "Invalid view name" });
    }
    if (!selection.trim()) {
      return makePlan({ title: "Extract partial", refusal: "Empty selection" });
    }
    const filePath = CodeActionPlanner.viewPathForName(basePath, name);
    const include = `@include('${name}')`;
    return makePlan({
      title: `Extract partial [${name}]`,
      createPath: filePath,
      createContent: selection.trimEnd() + "\n",
      edits: [{ startOffset: selectionStart, endOffset: selectionEnd, newText: include }],
    });
  },

  /**
   * ``@include('alert')`` / ``@include('components.alert')`` → ``<x-alert />``.
   */
  includeToComponent(source: string, offset: number): RefactorPlan {
    const re = /@include(?:If|When|Unless)?\s*\(\s*(['"])(?<name>[^'"]*)\1/g;
    let match: RegExpExecArray | null;
    let found: RegExpExecArray | null = null;
    while ((match = re.exec(source)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      if (offset >= start && offset <= end) {
        found = match;
        break;
      }
    }
    if (!found) {
      return makePlan({
        title: "Convert include to component",
        refusal: "No @include under caret",
      });
    }
    let name = found.groups?.name;
    if (name == null || !name.trim()) {
      return makePlan({
        title: "Convert include to component",
        refusal: "Missing name",
      });
    }
    if (name.startsWith("components.")) name = name.slice("components.".length);
    const tag = `<x-${name} />`;
    return makePlan({
      title: `Convert to <${tag}>`,
      edits: [
        {
          startOffset: found.index,
          endOffset: found.index + found[0].length,
          newText: tag,
        },
      ],
    });
  },

  applyToText(text: string, edits: RefactorEdit[]): string {
    let result = text;
    for (const edit of [...edits].sort((a, b) => b.startOffset - a.startOffset)) {
      result =
        result.slice(0, edit.startOffset) + edit.newText + result.slice(edit.endOffset);
    }
    return result;
  },
};

export const AlmasixRefactorPlanner = RefactorPlanner;
