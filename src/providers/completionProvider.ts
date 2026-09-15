import * as vscode from "vscode";
import { CallSiteDetector } from "../core/callSiteDetector";
import { CompletionCatalog } from "../core/completionCatalog";
import { EnvBulkInsert } from "../core/envBulkInsert";
import type { IndexService } from "../core/indexService";
import { SymbolKind } from "../core/types";

export function createCompletionProvider(
  indexService: IndexService,
): vscode.CompletionItemProvider {
  return {
    provideCompletionItems(document, position) {
      const index = indexService.index;
      // Soft index: still complete when routes/views exist even if ok=false
      if (!index.ok && Object.keys(index.routes).length === 0 && Object.keys(index.views).length === 0) {
        return undefined;
      }

      const before = document.getText(
        new vscode.Range(new vscode.Position(0, 0), position),
      );
      const dotenv =
        document.languageId === "dotenv" ||
        document.fileName.endsWith(".env") ||
        /\/\.env(\.|$)/.test(document.fileName.replace(/\\/g, "/"));
      const isPrism =
        document.languageId === "prism-html" || document.fileName.endsWith(".prism.html");

      const site = CallSiteDetector.detect(before, dotenv);
      if (!site) {
        // JetBrains parity: Prism fallback directives + template helpers when no site
        if (isPrism && !before.trimEnd().endsWith("@")) {
          const items: vscode.CompletionItem[] = [];
          for (const [label, detail] of [
            ...[...index.directives].map((n) => [n, "directive"] as const),
            ...[...index.templateVarNames()].map((n) => [n, "helper"] as const),
          ]) {
            const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Keyword);
            item.detail = detail;
            items.push(item);
          }
          return items;
        }
        return undefined;
      }

      const items: vscode.CompletionItem[] = [];

      if (site.kind === SymbolKind.ENV && dotenv) {
        const offer = EnvBulkInsert.offer(Object.keys(index.envKeys), site.prefix);
        if (offer) {
          const bulk = new vscode.CompletionItem(
            offer.presentableText,
            vscode.CompletionItemKind.Snippet,
          );
          bulk.insertText = EnvBulkInsert.dotenvInsertion(offer.keys);
          bulk.filterText = offer.lookupString;
          bulk.detail = "Almasix";
          bulk.sortText = "0";
          if (site.prefix) {
            bulk.range = new vscode.Range(
              position.translate(0, -site.prefix.length),
              position,
            );
          }
          items.push(bulk);
        }
      }

      for (const [label, detail] of CompletionCatalog.symbolsFor(index, site, before)) {
        if (
          site.prefix &&
          !label.toLowerCase().startsWith(site.prefix.toLowerCase()) &&
          !label.toLowerCase().includes(site.prefix.toLowerCase())
        ) {
          continue;
        }
        const item = new vscode.CompletionItem(label, kindFor(site.kind));
        item.detail = detail;
        item.sortText = `1${label}`;
        if (site.prefix) {
          item.range = new vscode.Range(
            position.translate(0, -site.prefix.length),
            position,
          );
        }
        items.push(item);
      }
      return items;
    },
  };
}

function kindFor(kind: SymbolKind): vscode.CompletionItemKind {
  switch (kind) {
    case SymbolKind.ROUTE:
      return vscode.CompletionItemKind.Reference;
    case SymbolKind.VIEW:
    case SymbolKind.COMPONENT:
    case SymbolKind.VITE:
      return vscode.CompletionItemKind.File;
    case SymbolKind.CONFIG:
    case SymbolKind.ENV:
    case SymbolKind.ENV_VALUE:
      return vscode.CompletionItemKind.Variable;
    case SymbolKind.DIRECTIVE:
      return vscode.CompletionItemKind.Keyword;
    case SymbolKind.COLUMN:
    case SymbolKind.ATTR:
    case SymbolKind.MODEL_ATTR:
    case SymbolKind.RELATION:
      return vscode.CompletionItemKind.Field;
    default:
      return vscode.CompletionItemKind.Value;
  }
}
