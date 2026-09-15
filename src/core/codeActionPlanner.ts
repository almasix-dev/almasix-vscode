import * as path from "node:path";
import type { AlmasixIndex } from "./types";
import { SymbolKind } from "./types";

/**
 * Pure planners for Almasix quick-fixes / intentions (create missing view,
 * suggest `smith make:*`, etc.).
 */
export interface CodeAction {
  id: string;
  title: string;
  kind: SymbolKind;
  name: string;
  /** Absolute path of a file to create (when applicable). */
  createPath?: string | null;
  /** Arguments for `smith` (e.g. `make:view auth.login`). */
  smithArgs?: string | null;
}

export const CodeActionPlanner = {
  /**
   * Suggest fixes when [name] is an unknown symbol of [kind] under [index].
   * Empty when the symbol is known / blank / unsupported.
   */
  forUnknownSymbol(
    index: AlmasixIndex,
    kind: SymbolKind,
    name: string,
  ): CodeAction[] {
    if (!name.trim()) return [];
    if (index.known(kind, name)) return [];
    switch (kind) {
      case SymbolKind.VIEW:
        return [
          createViewAction(index, name),
          smithAction("make:view", name, `Create view via smith make:view ${name}`),
        ];
      case SymbolKind.COMPONENT:
        return [
          createComponentViewAction(index, name),
          smithAction(
            "make:component",
            name,
            `Create component via smith make:component ${name}`,
          ),
        ];
      case SymbolKind.CONTROLLER_ACTION: {
        const controller = name.includes("@")
          ? name.slice(0, name.indexOf("@"))
          : name;
        return [
          smithAction("make:controller", controller, "Create controller via smith"),
        ];
      }
      case SymbolKind.MIDDLEWARE:
        return [
          smithAction(
            "make:middleware",
            name,
            `Create middleware via smith make:middleware ${name}`,
          ),
        ];
      case SymbolKind.MAILER:
        return [
          smithAction("make:mail", name, `Create mailable via smith make:mail ${name}`),
        ];
      case SymbolKind.INERTIA:
      case SymbolKind.ROUTE:
      case SymbolKind.CONFIG:
      case SymbolKind.ENV:
        return [];
      default:
        return [];
    }
  },

  viewPathForName(basePath: string, dottedName: string): string {
    const rel = dottedName.replace(/\./g, "/") + ".prism.html";
    const base = basePath.trim() ? basePath : ".";
    return path.normalize(path.join(base, "resources/views", rel));
  },

  componentPathForName(basePath: string, name: string): string {
    const rel = name.replace(/\./g, "/") + ".prism.html";
    const base = basePath.trim() ? basePath : ".";
    return path.normalize(path.join(base, "resources/views/components", rel));
  },

  /** Empty Prism stub body for a newly created view/component. */
  stubPrismContent(name: string): string {
    return `{{-- ${name} --}}\n`;
  },
};

function createViewAction(index: AlmasixIndex, name: string): CodeAction {
  const createPath = CodeActionPlanner.viewPathForName(index.basePath, name);
  return {
    id: "create-view-file",
    title: `Create view [${name}]`,
    kind: SymbolKind.VIEW,
    name,
    createPath,
  };
}

function createComponentViewAction(index: AlmasixIndex, name: string): CodeAction {
  const createPath = CodeActionPlanner.componentPathForName(index.basePath, name);
  return {
    id: "create-component-file",
    title: `Create component [${name}]`,
    kind: SymbolKind.COMPONENT,
    name,
    createPath,
  };
}

function smithAction(command: string, name: string, title: string): CodeAction {
  return {
    id: `smith-${command}`,
    title,
    kind: SymbolKind.SMITH,
    name,
    smithArgs: `${command} ${name}`,
  };
}

export const AlmasixCodeActionPlanner = CodeActionPlanner;
