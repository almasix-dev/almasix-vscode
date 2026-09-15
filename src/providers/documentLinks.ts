import * as vscode from "vscode";
import type { IndexService } from "../core/indexService";
import { SymbolHits } from "../core/symbolHits";
import { SymbolResolver } from "../core/symbolResolver";

/**
 * Document links on navigable Almasix ranges — Ctrl/Cmd-hover underline.
 * Covers quoted call-site strings and `{{ template_var }}` identifiers.
 */
export function createDocumentLinkProvider(
  indexService: IndexService,
): vscode.DocumentLinkProvider {
  return {
    provideDocumentLinks(document) {
      const index = indexService.index;
      if (!index.ok && Object.keys(index.routes).length === 0 && Object.keys(index.views).length === 0) {
        return [];
      }
      const text = document.getText();
      const links: vscode.DocumentLink[] = [];
      for (const hit of SymbolHits.allHits(text)) {
        const viewName = index.viewNameForPath(document.uri.fsPath);
        const target = SymbolResolver.resolve(
          index,
          hit.kind,
          hit.name,
          hit.receiver,
          viewName,
        );
        if (!target) continue;
        const range = new vscode.Range(
          document.positionAt(hit.range.startOffset),
          document.positionAt(hit.range.endOffset),
        );
        const uri = vscode.Uri.file(target.path).with({
          fragment: `L${(target.line ?? 0) + 1}`,
        });
        const link = new vscode.DocumentLink(range, uri);
        link.tooltip = `Go to ${hit.kind.toLowerCase()} ${hit.name}`;
        links.push(link);
      }
      return links;
    },
  };
}
