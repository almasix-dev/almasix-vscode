import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { CallSiteSearcher } from "../core/callSiteSearcher";
import type { IndexService } from "../core/indexService";
import { RenamePlanner } from "../core/renamePlanner";
import { SymbolLocator } from "../core/symbolLocator";
import { SymbolKind } from "../core/types";

export function createRenameProvider(indexService: IndexService): vscode.RenameProvider {
  return {
    prepareRename(document, position) {
      const index = indexService.index;
      if (!index.ok) throw new Error("Almasix index not ready");
      const hit = SymbolLocator.hitAt(document.getText(), document.offsetAt(position));
      if (!hit || !RenamePlanner.RENAMABLE.has(hit.kind)) {
        throw new Error("Symbol cannot be renamed via Almasix");
      }
      return new vscode.Range(
        document.positionAt(hit.range.startOffset),
        document.positionAt(hit.range.endOffset),
      );
    },

    async provideRenameEdits(document, position, newName) {
      const index = indexService.index;
      const root = indexService.appRoot();
      if (!index.ok || !root) return null;
      const hit = SymbolLocator.hitAt(document.getText(), document.offsetAt(position));
      if (!hit) return null;

      const reason = RenamePlanner.validateNewName(hit.kind, newName);
      if (reason) {
        throw new Error(reason);
      }

      const occurrences = CallSiteSearcher.findUsages(root, hit.kind, hit.name);
      const fileMoves = [];
      if (hit.kind === SymbolKind.VIEW || hit.kind === SymbolKind.COMPONENT) {
        const move = RenamePlanner.planViewFileMove(
          hit.kind,
          hit.name,
          newName,
          hit.kind === SymbolKind.VIEW
            ? index.views[hit.name]
            : index.components[hit.name] ?? index.views[`components.${hit.name}`],
          index.basePath || root,
        );
        if (move) fileMoves.push(move);
      }

      const definitionEdits = [];
      if (hit.kind === SymbolKind.CONFIG) {
        const loc = index.configLocations[hit.name];
        const stem = hit.name.split(".")[0] ?? "";
        const configPath = (loc?.path || index.configFiles[stem] || "").trim();
        if (configPath) {
          try {
            const text = fs.readFileSync(configPath, "utf8");
            definitionEdits.push(
              ...RenamePlanner.planConfigKeyDefinition(
                text,
                configPath,
                hit.name,
                newName,
                loc?.line ?? -1,
              ),
            );
          } catch {
            /* ignore unreadable config */
          }
        }
      }

      const plan = RenamePlanner.planFromOccurrences(
        hit.kind,
        hit.name,
        newName,
        occurrences,
        fileMoves,
        definitionEdits,
      );
      if (!plan.isAllowed) {
        throw new Error(plan.refusal ?? "Rename refused");
      }

      const edit = new vscode.WorkspaceEdit();
      const byFile = new Map<string, typeof plan.edits>();
      for (const e of plan.edits) {
        const list = byFile.get(e.path) ?? [];
        list.push(e);
        byFile.set(e.path, list);
      }
      for (const [filePath, edits] of byFile) {
        const uri = vscode.Uri.file(filePath);
        let doc: vscode.TextDocument;
        try {
          doc = await vscode.workspace.openTextDocument(uri);
        } catch {
          continue;
        }
        for (const e of edits) {
          edit.replace(
            uri,
            new vscode.Range(doc.positionAt(e.startOffset), doc.positionAt(e.endOffset)),
            e.newText,
          );
        }
      }
      for (const move of plan.fileMoves) {
        const from = vscode.Uri.file(move.fromPath);
        const to = vscode.Uri.file(move.toPath);
        const dir = path.dirname(move.toPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        edit.renameFile(from, to, { overwrite: false });
      }
      return edit;
    },
  };
}
