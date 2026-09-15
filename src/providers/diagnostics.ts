import * as vscode from "vscode";
import type { IndexService } from "../core/indexService";
import { analyze as analyzePrism } from "../core/prismStructure";
import { SymbolHits } from "../core/symbolHits";
import { SymbolResolver } from "../core/symbolResolver";
import { SymbolKind } from "../core/types";

const ANNOTATED = new Set<SymbolKind>([
  SymbolKind.ROUTE,
  SymbolKind.VIEW,
  SymbolKind.CONFIG,
  SymbolKind.TRANSLATION,
  SymbolKind.COMPONENT,
  SymbolKind.GATE,
  SymbolKind.MIDDLEWARE,
  SymbolKind.DISK,
  SymbolKind.INERTIA,
  SymbolKind.ENV,
  SymbolKind.TEMPLATE_VAR,
]);

export class DiagnosticsController {
  private readonly collection: vscode.DiagnosticCollection;
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly indexService: IndexService) {
    this.collection = vscode.languages.createDiagnosticCollection("almasix");
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.collection.dispose();
  }

  get diagnosticCollection(): vscode.DiagnosticCollection {
    return this.collection;
  }

  schedule(document: vscode.TextDocument, debounceMs = 300): void {
    if (!isSupported(document)) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.refresh(document);
    }, debounceMs);
  }

  refresh(document: vscode.TextDocument): void {
    if (!isSupported(document)) {
      this.collection.delete(document.uri);
      return;
    }
    const index = this.indexService.index;
    const text = document.getText();
    const diagnostics: vscode.Diagnostic[] = [];

    if (document.languageId === "prism-html" || document.fileName.endsWith(".prism.html")) {
      for (const issue of analyzePrism(text)) {
        const diag = new vscode.Diagnostic(
          new vscode.Range(
            document.positionAt(issue.startOffset),
            document.positionAt(issue.endOffset),
          ),
          issue.message,
          vscode.DiagnosticSeverity.Error,
        );
        diag.source = "almasix";
        diag.code = "prism-structure";
        diagnostics.push(diag);
      }
    }

    if (index.ok || Object.keys(index.routes).length > 0 || Object.keys(index.views).length > 0) {
      for (const hit of SymbolHits.allHits(text)) {
        if (!ANNOTATED.has(hit.kind)) continue;
        if (hit.kind === SymbolKind.TRANSLATION && index.translationKeys.size === 0) continue;
        if (hit.kind === SymbolKind.GATE && index.gates.size === 0) continue;
        const viewName = index.viewNameForPath(document.uri.fsPath);
        const resolvable =
          SymbolResolver.resolve(index, hit.kind, hit.name, hit.receiver, viewName) != null;
        if (resolvable) continue;
        if (index.known(hit.kind, hit.name)) continue;
        const diag = new vscode.Diagnostic(
          new vscode.Range(
            document.positionAt(hit.range.startOffset),
            document.positionAt(hit.range.endOffset),
          ),
          `Unknown Almasix ${hit.kind.toLowerCase()}: ${hit.name}`,
          vscode.DiagnosticSeverity.Warning,
        );
        diag.source = "almasix";
        diag.code = "unknown-symbol";
        diagnostics.push(diag);
      }
    }

    this.collection.set(document.uri, diagnostics);
  }
}

function isSupported(document: vscode.TextDocument): boolean {
  return (
    document.languageId === "python" ||
    document.languageId === "prism-html" ||
    document.languageId === "dotenv"
  );
}
