import * as vscode from "vscode";
import type { IndexService } from "../core/indexService";
import { SymbolLocator } from "../core/symbolLocator";
import { SymbolResolver } from "../core/symbolResolver";

export function createDefinitionProvider(
  indexService: IndexService,
): vscode.DefinitionProvider {
  return {
    provideDefinition(document, position) {
      const index = indexService.index;
      if (!index.ok) return undefined;
      const text = document.getText();
      const offset = document.offsetAt(position);
      const hit = SymbolLocator.hitAt(text, offset);
      if (!hit) return undefined;
      const viewName = index.viewNameForPath(document.uri.fsPath);
      const target = SymbolResolver.resolve(
        index,
        hit.kind,
        hit.name,
        hit.receiver,
        viewName,
      );
      if (!target) return undefined;
      const uri = vscode.Uri.file(target.path);
      const line = target.line ?? 0;
      return new vscode.Location(uri, new vscode.Position(line, 0));
    },
  };
}
