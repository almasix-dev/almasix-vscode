import * as vscode from "vscode";
import type { IndexService } from "../core/indexService";
import { SymbolResolver } from "../core/symbolResolver";
import { ToolWindowModel } from "../core/toolWindowModel";
import { SymbolKind } from "../core/types";

type Category =
  | "Routes"
  | "Views"
  | "Config"
  | "Components"
  | "Env"
  | "Tables"
  | "Gates";

const KIND_MAP: Record<string, SymbolKind> = {
  route: SymbolKind.ROUTE,
  view: SymbolKind.VIEW,
  config: SymbolKind.CONFIG,
  component: SymbolKind.COMPONENT,
  env: SymbolKind.ENV,
  table: SymbolKind.TABLE,
  gate: SymbolKind.GATE,
};

const NAVIGABLE = new Set([
  SymbolKind.ROUTE,
  SymbolKind.VIEW,
  SymbolKind.CONFIG,
  SymbolKind.COMPONENT,
  SymbolKind.ENV,
  SymbolKind.TABLE,
]);

export class SymbolTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    TreeNode | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private filter = "";

  constructor(private readonly indexService: IndexService) {
    indexService.onDidChange(() => this.refresh());
  }

  getFilter(): string {
    return this.filter;
  }

  setFilter(query: string): void {
    this.filter = query;
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    const index = this.indexService.index;
    if (!element) {
      const summary = ToolWindowModel.summary(index);
      const status = new TreeNode(
        ToolWindowModel.statusLine(summary),
        vscode.TreeItemCollapsibleState.None,
      );
      status.contextValue = "almasix.status";
      status.iconPath = new vscode.ThemeIcon(summary.ok ? "check" : "warning");
      status.description = this.filter ? `filter: ${this.filter}` : undefined;

      if (this.filter.trim()) {
        const rows = ToolWindowModel.symbolRows(index, this.filter);
        return [
          status,
          ...rows.map((row) => symbolNode(row.kind, row.name, row.detail)),
        ];
      }

      const categories: Category[] = [
        "Routes",
        "Views",
        "Config",
        "Components",
        "Env",
        "Tables",
        "Gates",
      ];
      return [
        status,
        ...categories.map((c) => {
          const item = new TreeNode(c, vscode.TreeItemCollapsibleState.Collapsed);
          item.description = String(countFor(c, summary));
          item.contextValue = "almasix.category";
          return item;
        }),
      ];
    }

    if (element.contextValue === "almasix.category") {
      const kindKey =
        element.label === "Routes"
          ? "route"
          : element.label === "Views"
            ? "view"
            : element.label === "Config"
              ? "config"
              : element.label === "Components"
                ? "component"
                : element.label === "Env"
                  ? "env"
                  : element.label === "Tables"
                    ? "table"
                    : "gate";
      return ToolWindowModel.symbolRows(index, "")
        .filter((r) => r.kind === kindKey)
        .map((row) => symbolNode(row.kind, row.name, row.detail));
    }
    return [];
  }
}

function symbolNode(kind: string, name: string, detail: string): TreeNode {
  const node = new TreeNode(name, vscode.TreeItemCollapsibleState.None);
  node.description = detail;
  node.tooltip = `${kind}: ${name}`;
  node.contextValue = "almasix.symbol";
  node.iconPath = new vscode.ThemeIcon(iconForKind(kind));
  const symbolKind = KIND_MAP[kind];
  if (symbolKind && NAVIGABLE.has(symbolKind)) {
    node.command = {
      command: "almasix.openSymbol",
      title: "Open Symbol",
      arguments: [symbolKind, name],
    };
  }
  return node;
}

export class TreeNode extends vscode.TreeItem {
  constructor(
    public override label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState);
  }
}

export async function openSymbol(
  indexService: IndexService,
  kind: SymbolKind,
  name: string,
): Promise<void> {
  const target = SymbolResolver.resolve(indexService.index, kind, name);
  if (!target) {
    void vscode.window.showWarningMessage(`Could not resolve ${kind} ${name}`);
    return;
  }
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(target.path));
  const editor = await vscode.window.showTextDocument(doc);
  const line = target.line ?? 0;
  const pos = new vscode.Position(line, 0);
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
}

function countFor(category: Category, summary: ReturnType<typeof ToolWindowModel.summary>): number {
  switch (category) {
    case "Routes":
      return summary.routes;
    case "Views":
      return summary.views;
    case "Config":
      return summary.configKeys;
    case "Components":
      return summary.components;
    case "Env":
      return summary.envKeys;
    case "Tables":
      return summary.tables;
    case "Gates":
      return summary.gates;
  }
}

function iconForKind(kind: string): string {
  switch (kind) {
    case "route":
      return "link";
    case "view":
      return "file-code";
    case "config":
      return "settings-gear";
    case "component":
      return "symbol-structure";
    case "env":
      return "key";
    case "table":
      return "database";
    case "gate":
      return "shield";
    default:
      return "symbol-misc";
  }
}
