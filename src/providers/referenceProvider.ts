import * as fs from "node:fs";
import * as vscode from "vscode";
import { CallSiteSearcher } from "../core/callSiteSearcher";
import type { IndexService } from "../core/indexService";
import { SymbolLocator } from "../core/symbolLocator";

export function createReferenceProvider(
  indexService: IndexService,
): vscode.ReferenceProvider {
  return {
    provideReferences(document, position) {
      const index = indexService.index;
      const root = indexService.appRoot();
      if (!index.ok || !root) return undefined;
      const text = document.getText();
      const offset = document.offsetAt(position);
      const hit = SymbolLocator.hitAt(text, offset);
      if (!hit || !CallSiteSearcher.SUPPORTED.has(hit.kind)) return undefined;
      const occurrences = CallSiteSearcher.findUsages(root, hit.kind, hit.name);
      return occurrences.map((occ) => {
        const uri = vscode.Uri.file(occ.path);
        const start = offsetToPosition(document, occ.path, occ.range.startOffset);
        const end = offsetToPosition(document, occ.path, occ.range.endOffset);
        return new vscode.Location(uri, new vscode.Range(start, end));
      });
    },
  };
}

function offsetToPosition(
  current: vscode.TextDocument,
  filePath: string,
  offset: number,
): vscode.Position {
  if (current.uri.fsPath === filePath) {
    return current.positionAt(offset);
  }
  try {
    const text = fs.readFileSync(filePath, "utf8");
    let line = 0;
    let col = 0;
    for (let i = 0; i < offset && i < text.length; i++) {
      if (text[i] === "\n") {
        line++;
        col = 0;
      } else {
        col++;
      }
    }
    return new vscode.Position(line, col);
  } catch {
    return new vscode.Position(0, 0);
  }
}
