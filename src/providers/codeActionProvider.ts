import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { CodeActionPlanner } from "../core/codeActionPlanner";
import type { IndexService } from "../core/indexService";
import { RefactorPlanner } from "../core/refactorPlanner";
import { RelationStubPlanner } from "../core/relationStubPlanner";
import { SymbolLocator } from "../core/symbolLocator";
import { runSmith } from "../smith/runner";

export function createCodeActionProvider(
  indexService: IndexService,
): vscode.CodeActionProvider {
  return {
    provideCodeActions(document, range, context) {
      const index = indexService.index;
      const root = indexService.appRoot();
      const actions: vscode.CodeAction[] = [];

      // Unknown-symbol quick fixes from diagnostics
      for (const diag of context.diagnostics) {
        if (diag.source !== "almasix") continue;
        const hit = SymbolLocator.hitAt(
          document.getText(),
          document.offsetAt(diag.range.start) + 1,
        );
        if (!hit || !index.ok) continue;
        for (const plan of CodeActionPlanner.forUnknownSymbol(index, hit.kind, hit.name)) {
          const action = new vscode.CodeAction(plan.title, vscode.CodeActionKind.QuickFix);
          action.diagnostics = [diag];
          if (plan.createPath) {
            action.command = {
              title: plan.title,
              command: "almasix.createStubFile",
              arguments: [plan.createPath, CodeActionPlanner.stubPrismContent(plan.name)],
            };
          } else if (plan.smithArgs && root) {
            action.command = {
              title: plan.title,
              command: "almasix.runSmithArgs",
              arguments: [root, plan.smithArgs],
            };
          }
          actions.push(action);
        }
      }

      // Refactors on selection / caret
      if (document.languageId === "prism-html" && !range.isEmpty) {
        const selected = document.getText(range);
        const extract = new vscode.CodeAction(
          "Extract Prism partial…",
          vscode.CodeActionKind.RefactorExtract,
        );
        extract.command = {
          title: "Extract Prism partial",
          command: "almasix.extractPartial",
          arguments: [
            document.uri,
            range,
            selected,
            document.offsetAt(range.start),
            document.offsetAt(range.end),
          ],
        };
        actions.push(extract);
      }

      const offset = document.offsetAt(range.start);
      const includePlan = RefactorPlanner.includeToComponent(document.getText(), offset);
      if (includePlan.isAllowed) {
        const action = new vscode.CodeAction(
          includePlan.title,
          vscode.CodeActionKind.RefactorRewrite,
        );
        const edit = new vscode.WorkspaceEdit();
        for (const e of includePlan.edits) {
          edit.replace(
            document.uri,
            new vscode.Range(
              document.positionAt(e.startOffset),
              document.positionAt(e.endOffset),
            ),
            e.newText,
          );
        }
        action.edit = edit;
        actions.push(action);
      }

      if (document.languageId === "python" && /class\s+[A-Z]/.test(document.getText())) {
        const insertRel = new vscode.CodeAction(
          "Insert Articulate relation stub…",
          vscode.CodeActionKind.Refactor,
        );
        insertRel.command = {
          title: "Insert relation stub",
          command: "almasix.insertRelationStub",
          arguments: [document.uri],
        };
        actions.push(insertRel);
      }

      return actions;
    },
  };
}

export function registerCodeActionCommands(
  context: vscode.ExtensionContext,
  indexService: IndexService,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "almasix.createStubFile",
      async (filePath: string, contents: string) => {
        const uri = vscode.Uri.file(filePath);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const edit = new vscode.WorkspaceEdit();
        edit.createFile(uri, { ignoreIfExists: true });
        await vscode.workspace.applyEdit(edit);
        const doc = await vscode.workspace.openTextDocument(uri);
        const we = new vscode.WorkspaceEdit();
        if (doc.getText().length === 0) {
          we.insert(uri, new vscode.Position(0, 0), contents);
          await vscode.workspace.applyEdit(we);
        }
        await vscode.window.showTextDocument(doc);
        await indexService.rebuild();
      },
    ),
    vscode.commands.registerCommand(
      "almasix.runSmithArgs",
      async (root: string, smithArgs: string) => {
        const parts = smithArgs.trim().split(/\s+/);
        await runSmith(root, parts);
        await indexService.rebuild();
      },
    ),
    vscode.commands.registerCommand(
      "almasix.extractPartial",
      async (
        uri: vscode.Uri,
        range: vscode.Range,
        selected: string,
        start: number,
        end: number,
      ) => {
        const name = await vscode.window.showInputBox({
          prompt: "Partial view name (e.g. posts._card)",
          placeHolder: "partials.card",
        });
        if (!name) return;
        const root = indexService.appRoot() ?? "";
        const plan = RefactorPlanner.extractPartial(root, selected, start, end, name);
        if (!plan.isAllowed) {
          void vscode.window.showErrorMessage(plan.refusal ?? "Extract refused");
          return;
        }
        if (plan.createPath && plan.createContent != null) {
          const createUri = vscode.Uri.file(plan.createPath);
          const dir = path.dirname(plan.createPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const we = new vscode.WorkspaceEdit();
          we.createFile(createUri, { ignoreIfExists: true });
          await vscode.workspace.applyEdit(we);
          const created = await vscode.workspace.openTextDocument(createUri);
          if (created.getText().length === 0) {
            const fill = new vscode.WorkspaceEdit();
            fill.insert(createUri, new vscode.Position(0, 0), plan.createContent);
            await vscode.workspace.applyEdit(fill);
          }
        }
        const doc = await vscode.workspace.openTextDocument(uri);
        const edit = new vscode.WorkspaceEdit();
        for (const e of plan.edits) {
          edit.replace(
            uri,
            new vscode.Range(doc.positionAt(e.startOffset), doc.positionAt(e.endOffset)),
            e.newText,
          );
        }
        await vscode.workspace.applyEdit(edit);
        await indexService.rebuild();
      },
    ),
    vscode.commands.registerCommand(
      "almasix.insertRelationStub",
      async (uri: vscode.Uri) => {
        const name = await vscode.window.showInputBox({
          prompt: "Relation method name",
          placeHolder: "posts",
        });
        if (!name) return;
        const related = await vscode.window.showInputBox({
          prompt: "Related model class",
          placeHolder: "Post",
          value: "Related",
        });
        const doc = await vscode.workspace.openTextDocument(uri);
        const plan = RelationStubPlanner.planInsert(doc.getText(), name, related || "Related");
        if (!plan.isAllowed) {
          void vscode.window.showErrorMessage(plan.refusal ?? "Insert refused");
          return;
        }
        const edit = new vscode.WorkspaceEdit();
        for (const e of plan.edits) {
          edit.replace(
            uri,
            new vscode.Range(doc.positionAt(e.startOffset), doc.positionAt(e.endOffset)),
            e.newText,
          );
        }
        await vscode.workspace.applyEdit(edit);
      },
    ),
  );
}
