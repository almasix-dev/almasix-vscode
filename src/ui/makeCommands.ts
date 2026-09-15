import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { FileTemplates } from "../core/fileTemplates";
import type { IndexService } from "../core/indexService";
import { MakeCatalog, type ModelOptions } from "../core/makeCatalog";
import { runSmith } from "../smith/runner";

export async function pickAndRunGenerator(indexService: IndexService): Promise<void> {
  const root = indexService.appRoot();
  if (!root) {
    void vscode.window.showErrorMessage("No Almasix app root (bootstrap/app.py) found.");
    return;
  }

  const pick = await vscode.window.showQuickPick(
    MakeCatalog.ALL.map((g) => ({
      label: g.label,
      description: g.command,
      detail: g.description,
      generator: g,
    })),
    { title: "Almasix: New…", placeHolder: "Choose a smith make:* generator" },
  );
  if (!pick) return;

  const g = pick.generator;
  if (g.interactive && g.id === "model") {
    await runNewModel(indexService, root);
    return;
  }

  let name: string | undefined;
  if (g.namePrompt) {
    name = await vscode.window.showInputBox({
      prompt: g.namePrompt,
      placeHolder: g.label,
    });
    if (name === undefined) return;
    if (g.namePrompt && !name.trim()) {
      void vscode.window.showErrorMessage("Name is required");
      return;
    }
  }

  const args = (g.smithArgs?.(name) ?? `${g.command} ${name ?? ""}`).trim().split(/\s+/);
  try {
    const result = await runSmith(root, args);
    if (result.code !== 0) {
      await writeOfflineStub(root, g.id, name?.trim() ?? "");
    }
  } catch {
    await writeOfflineStub(root, g.id, name?.trim() ?? "");
  }
  await indexService.rebuild();
}

export async function runNewModel(
  indexService: IndexService,
  root?: string,
): Promise<void> {
  const appRoot = root ?? indexService.appRoot();
  if (!appRoot) {
    void vscode.window.showErrorMessage("No Almasix app root (bootstrap/app.py) found.");
    return;
  }

  const name = await vscode.window.showInputBox({
    prompt: "Model name (e.g. Post)",
    placeHolder: "Post",
  });
  if (!name?.trim()) return;

  // Step 1: all companions shortcut (mirrors JB disabling others when -a)
  const mode = await vscode.window.showQuickPick(
    [
      { label: "All companions (-a)", description: "migration, factory, seeder, controller, …", id: "all" as const },
      { label: "Choose companions…", description: "Pick migration / factory / … individually", id: "pick" as const },
      { label: "Model only", description: "No companion files", id: "none" as const },
    ],
    { title: `Model options for ${name.trim()}` },
  );
  if (!mode) return;

  const options: ModelOptions = {};
  if (mode.id === "all") {
    options.all = true;
  } else if (mode.id === "pick") {
    const companions = await vscode.window.showQuickPick(
      [
        { label: "Migration (-m)", picked: true, flag: "migration" as const },
        { label: "Factory (-f)", picked: false, flag: "factory" as const },
        { label: "Seeder (-s)", picked: false, flag: "seed" as const },
        { label: "Controller (-c)", picked: false, flag: "controller" as const },
        { label: "Resource controller (-r)", picked: false, flag: "resource" as const },
        { label: "API resource (--api)", picked: false, flag: "api" as const },
        { label: "Policy (--policy)", picked: false, flag: "policy" as const },
        { label: "Form requests (-R)", picked: false, flag: "requests" as const },
      ],
      {
        title: `Companions for ${name.trim()}`,
        canPickMany: true,
        placeHolder: "Select companion files to generate",
      },
    );
    if (!companions) return;
    for (const c of companions) {
      options[c.flag] = true;
    }
  }

  const smithArgs = MakeCatalog.modelSmithArgs(name, options).split(/\s+/);
  try {
    const result = await runSmith(appRoot, smithArgs);
    if (result.code !== 0) {
      await writeOfflineStub(appRoot, "model", name.trim());
    }
  } catch {
    await writeOfflineStub(appRoot, "model", name.trim());
  }
  await indexService.rebuild();
}

async function writeOfflineStub(root: string, generatorId: string, name: string): Promise<void> {
  if (!name) return;
  const spec = FileTemplates.resolve(generatorId, name);
  if (!spec) {
    void vscode.window.showWarningMessage(
      `Smith make failed and no offline stub for ${generatorId}.`,
    );
    return;
  }
  const dest = path.join(root, spec.relativePath);
  if (fs.existsSync(dest)) {
    void vscode.window.showWarningMessage(`Stub already exists: ${spec.relativePath}`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, spec.contents, "utf8");
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(dest));
  await vscode.window.showTextDocument(doc);
  void vscode.window.showInformationMessage(
    `Wrote offline stub ${spec.relativePath} (smith unavailable).`,
  );
}
