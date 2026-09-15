import * as vscode from "vscode";
import { HoverDocs } from "../core/hoverDocs";
import type { IndexService } from "../core/indexService";
import { SymbolLocator } from "../core/symbolLocator";
export function createHoverProvider(indexService: IndexService): vscode.HoverProvider {
  return {
    provideHover(document, position) {
      const index = indexService.index;
      const text = document.getText();
      const offset = document.offsetAt(position);

      // Directive hover: @name under caret
      const line = document.lineAt(position.line).text;
      const dirMatch = /@([A-Za-z_][\w]*)/g;
      let m: RegExpExecArray | null;
      while ((m = dirMatch.exec(line)) !== null) {
        const start = m.index;
        const end = start + m[0].length;
        if (position.character >= start && position.character <= end) {
          const doc = HoverDocs.directive(m[1]!);
          if (doc) {
            return new vscode.Hover(
              new vscode.MarkdownString(doc),
              new vscode.Range(position.line, start, position.line, end),
            );
          }
        }
      }

      if (!index.ok) return undefined;
      const hit = SymbolLocator.hitAt(text, offset);
      if (!hit) return undefined;
      const md = HoverDocs.forSymbol(index, hit.kind, hit.name, hit.receiver);
      if (!md) return undefined;
      return new vscode.Hover(
        new vscode.MarkdownString(md),
        new vscode.Range(
          document.positionAt(hit.range.startOffset),
          document.positionAt(hit.range.endOffset),
        ),
      );
    },
  };
}
