import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  State,
} from "vscode-languageclient/node";
import { IndexService, isIndexRelevant } from "./core/indexService";
import { createCodeActionProvider, registerCodeActionCommands } from "./providers/codeActionProvider";
import { createCompletionProvider } from "./providers/completionProvider";
import { createDefinitionProvider } from "./providers/definitionProvider";
import { DiagnosticsController } from "./providers/diagnostics";
import { createDocumentLinkProvider } from "./providers/documentLinks";
import { createHoverProvider } from "./providers/hoverProvider";
import { createReferenceProvider } from "./providers/referenceProvider";
import { createRenameProvider } from "./providers/renameProvider";
import { resolveSmith } from "./smith/runner";
import { pickAndRunGenerator, runNewModel } from "./ui/makeCommands";
import { openSymbol, SymbolTreeProvider } from "./ui/symbolTree";
import { SymbolKind } from "./core/types";

let client: LanguageClient | undefined;
let status: vscode.StatusBarItem | undefined;
let indexService: IndexService | undefined;

const DOCUMENT_SELECTOR: vscode.DocumentSelector = [
  { scheme: "file", language: "python" },
  { scheme: "file", language: "prism-html" },
  { scheme: "file", language: "dotenv" },
];

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const root = workspaceRoot();
  const cfg = () => vscode.workspace.getConfiguration("almasix");

  status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.text = "Almasix: starting…";
  status.command = "almasix.showAppInfo";
  status.show();
  context.subscriptions.push(status);

  indexService = new IndexService({
    workspaceRoot: root ?? process.cwd(),
    smithPath: cfg().get<string>("smithPath") || "",
    pythonPath: resolveConfiguredPath(cfg().get<string>("pythonPath") || ""),
  });

  const tree = new SymbolTreeProvider(indexService);
  context.subscriptions.push(
    vscode.window.createTreeView("almasixSymbols", {
      treeDataProvider: tree,
      showCollapseAll: true,
    }),
  );

  const diagnostics = new DiagnosticsController(indexService);
  context.subscriptions.push({ dispose: () => diagnostics.dispose() });

  const rebuild = async (announce = false): Promise<void> => {
    status!.text = "Almasix: indexing…";
    status!.backgroundColor = undefined;
    const index = await indexService!.rebuild();
    updateStatus(index);
    tree.refresh();
    if (vscode.window.activeTextEditor) {
      diagnostics.refresh(vscode.window.activeTextEditor.document);
    }
    if (announce) {
      if (index.ok) {
        void vscode.window.showInformationMessage(
          `Almasix index rebuilt — ${Object.keys(index.routes).length} routes, ${Object.keys(index.views).length} views.`,
        );
      } else {
        void vscode.window.showWarningMessage(
          `Almasix index error: ${index.error ?? "unknown"}`,
        );
      }
    }
  };

  indexService.onDidChange((index) => updateStatus(index));

  // Providers
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      DOCUMENT_SELECTOR,
      createCompletionProvider(indexService),
      "'",
      '"',
      ".",
      "@",
      "-",
      "_",
    ),
    vscode.languages.registerDefinitionProvider(
      DOCUMENT_SELECTOR,
      createDefinitionProvider(indexService),
    ),
    vscode.languages.registerReferenceProvider(
      DOCUMENT_SELECTOR,
      createReferenceProvider(indexService),
    ),
    vscode.languages.registerRenameProvider(
      DOCUMENT_SELECTOR,
      createRenameProvider(indexService),
    ),
    vscode.languages.registerHoverProvider(
      DOCUMENT_SELECTOR,
      createHoverProvider(indexService),
    ),
    vscode.languages.registerCodeActionsProvider(
      DOCUMENT_SELECTOR,
      createCodeActionProvider(indexService),
      {
        providedCodeActionKinds: [
          vscode.CodeActionKind.QuickFix,
          vscode.CodeActionKind.Refactor,
          vscode.CodeActionKind.RefactorExtract,
          vscode.CodeActionKind.RefactorRewrite,
        ],
      },
    ),
    vscode.languages.registerDocumentLinkProvider(
      DOCUMENT_SELECTOR,
      createDocumentLinkProvider(indexService),
    ),
  );

  registerCodeActionCommands(context, indexService);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("almasix.rebuildIndex", async () => {
      await rebuild(true);
    }),
    vscode.commands.registerCommand("almasix.showAppInfo", async () => {
      const index = indexService!.index;
      const app = indexService!.appRoot();
      const lines = [
        `App root: ${app ?? "(none)"}`,
        `Index ok: ${index.ok}`,
        index.error ? `Error: ${index.error}` : undefined,
        `Routes: ${Object.keys(index.routes).length}`,
        `Views: ${Object.keys(index.views).length}`,
        `Config keys: ${index.configKeys.size}`,
        `Components: ${Object.keys(index.components).length}`,
        `Env keys: ${Object.keys(index.envKeys).length}`,
        `Tables: ${Object.keys(index.tables).length}`,
        `Gates: ${index.gates.size}`,
        `Mode: ${cfg().get<boolean>("useLsp") ? "LSP (legacy)" : "native index"}`,
      ].filter(Boolean);
      void vscode.window.showInformationMessage(lines.join(" · "));
    }),
    vscode.commands.registerCommand("almasix.restart", async () => {
      await rebuild(true);
      if (cfg().get<boolean>("useLsp")) {
        await stopClient();
        await startClient(context);
      }
      void vscode.window.showInformationMessage("Almasix restarted.");
    }),
    // Back-compat alias
    vscode.commands.registerCommand("almasix.restartServer", async () => {
      await vscode.commands.executeCommand("almasix.restart");
    }),
    vscode.commands.registerCommand("almasix.newGenerator", async () => {
      await pickAndRunGenerator(indexService!);
    }),
    vscode.commands.registerCommand("almasix.newModel", async () => {
      await runNewModel(indexService!);
    }),
    vscode.commands.registerCommand("almasix.filterSymbols", async () => {
      const value = await vscode.window.showInputBox({
        title: "Filter Almasix symbols",
        value: tree.getFilter(),
        placeHolder: "Substring match (empty clears filter)",
      });
      if (value === undefined) return;
      tree.setFilter(value);
    }),
    vscode.commands.registerCommand(
      "almasix.openSymbol",
      async (kind: SymbolKind, name: string) => {
        await openSymbol(indexService!, kind, name);
      },
    ),
  );

  // Tasks
  context.subscriptions.push(
    vscode.tasks.registerTaskProvider("almasix", {
      provideTasks: () => {
        const appRoot = indexService!.appRoot() ?? root;
        if (!appRoot) return [];
        const launch = resolveSmith(appRoot, {
          smithPath: cfg().get<string>("smithPath") || "",
          pythonPath: resolveConfiguredPath(cfg().get<string>("pythonPath") || ""),
        });
        const defs: Array<{ name: string; args: string[] }> = [
          { name: "serve", args: ["serve"] },
          { name: "migrate", args: ["migrate"] },
          { name: "test", args: ["test"] },
          { name: "queue:work", args: ["queue:work"] },
        ];
        return defs.map((d) => {
          const execution = new vscode.ProcessExecution(launch.command, [
            ...launch.args,
            ...d.args,
          ], { cwd: appRoot });
          const task = new vscode.Task(
            { type: "almasix", task: d.name },
            vscode.TaskScope.Workspace,
            d.name,
            "almasix",
            execution,
          );
          task.group =
            d.name === "test" ? vscode.TaskGroup.Test : vscode.TaskGroup.Build;
          task.presentationOptions = { reveal: vscode.TaskRevealKind.Always };
          return task;
        });
      },
      resolveTask: (task) => {
        const appRoot = indexService!.appRoot() ?? root;
        if (!appRoot) return undefined;
        const name = (task.definition as { task?: string }).task;
        if (!name) return undefined;
        const launch = resolveSmith(appRoot, {
          smithPath: cfg().get<string>("smithPath") || "",
          pythonPath: resolveConfiguredPath(cfg().get<string>("pythonPath") || ""),
        });
        task.execution = new vscode.ProcessExecution(launch.command, [
          ...launch.args,
          ...String(name).split(/\s+/),
        ], { cwd: appRoot });
        return task;
      },
    }),
  );

  // Watchers → rebuild
  const watcher = vscode.workspace.createFileSystemWatcher(
    "**/{routes,config,resources/views,app/models,database/migrations,lang,app/policies}/**",
  );
  const envWatcher = vscode.workspace.createFileSystemWatcher("**/.env*");
  const onWatch = (uri: vscode.Uri) => {
    if (isIndexRelevant(uri.fsPath)) {
      void rebuild(false);
    }
  };
  watcher.onDidChange(onWatch);
  watcher.onDidCreate(onWatch);
  watcher.onDidDelete(onWatch);
  envWatcher.onDidChange(onWatch);
  envWatcher.onDidCreate(onWatch);
  envWatcher.onDidDelete(onWatch);
  context.subscriptions.push(watcher, envWatcher);

  // Diagnostics debounce
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      diagnostics.schedule(e.document);
    }),
    vscode.workspace.onDidOpenTextDocument((doc) => {
      diagnostics.refresh(doc);
    }),
  );

  await rebuild(false);

  // Optional legacy LSP
  if (cfg().get<boolean>("useLsp") === true) {
    await startClient(context);
  }
}

export async function deactivate(): Promise<void> {
  await stopClient();
}

function updateStatus(index: import("./core/types").AlmasixIndex): void {
  if (!status) return;
  if (!index.ok) {
    status.text = "Almasix · error";
    status.tooltip = index.error ?? "Index failed";
    status.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
    return;
  }
  const routes = Object.keys(index.routes).length;
  const views = Object.keys(index.views).length;
  status.text = `Almasix · ${routes} routes · ${views} views`;
  status.tooltip = [
    `Config ${index.configKeys.size}`,
    `Components ${Object.keys(index.components).length}`,
    `Env ${Object.keys(index.envKeys).length}`,
    `Tables ${Object.keys(index.tables).length}`,
  ].join(" · ");
  status.backgroundColor = undefined;
}

function workspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function resolveConfiguredPath(configured: string): string {
  const root = workspaceRoot();
  let value = configured.trim();
  if (!value) return "";
  value = value.replace(/\$\{workspaceFolder\}/g, root || "");
  return value;
}

async function startClient(context: vscode.ExtensionContext): Promise<void> {
  const launch = resolveServerCommand();
  if (!launch) {
    if (status) {
      status.text = "Almasix: LSP missing";
      status.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
    }
    void vscode.window.showErrorMessage(
      "Almasix LSP not found. Install with: pip install 'almasix[lsp]', or set almasix.useLsp=false for native mode.",
    );
    return;
  }

  const serverOptions: ServerOptions = {
    command: launch.command,
    args: launch.args,
    options: { cwd: workspaceRoot() },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: "python" },
      { scheme: "file", language: "prism-html" },
      { scheme: "file", language: "html" },
      { scheme: "file", language: "dotenv" },
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher(
        "**/{*.py,*.prism.html,*.html,.env,.env.*}",
      ),
    },
  };

  client = new LanguageClient("almasix", "Almasix Language Server", serverOptions, clientOptions);
  context.subscriptions.push(client);
  client.onDidChangeState((event) => {
    if (!status || vscode.workspace.getConfiguration("almasix").get("useLsp") !== true) {
      return;
    }
    if (event.newState === State.Running) {
      status.text = "Almasix (LSP)";
      status.backgroundColor = undefined;
    } else if (event.newState === State.Starting) {
      status.text = "Almasix: LSP starting…";
    }
  });

  try {
    await client.start();
  } catch (err) {
    void vscode.window.showErrorMessage(`Almasix LSP failed to start: ${String(err)}`);
  }
}

async function stopClient(): Promise<void> {
  if (client) {
    await client.stop();
    client = undefined;
  }
}

function resolveServerCommand(): { command: string; args: string[] } | undefined {
  const cfg = vscode.workspace.getConfiguration("almasix");
  const override = (cfg.get<string>("lsp.command") || "").trim();
  const extra = cfg.get<string[]>("lsp.args") || [];
  if (override) {
    return { command: override, args: extra };
  }

  const python = resolvePython(cfg.get<string>("pythonPath") || "");
  const root = workspaceRoot();
  const candidates: Array<{ command: string; args: string[] }> = [];
  if (python) {
    candidates.push({ command: python, args: ["-m", "almasix.lsp", ...extra] });
    const binDir = path.dirname(python);
    const lspBin = path.join(
      binDir,
      process.platform === "win32" ? "almasix-lsp.exe" : "almasix-lsp",
    );
    if (fs.existsSync(lspBin)) {
      candidates.unshift({ command: lspBin, args: [...extra] });
    }
  }
  if (root) {
    const venvPython = path.join(
      root,
      ".venv",
      process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
    );
    if (fs.existsSync(venvPython)) {
      candidates.push({ command: venvPython, args: ["-m", "almasix.lsp", ...extra] });
    }
  }
  candidates.push({ command: "almasix-lsp", args: [...extra] });
  candidates.push({ command: "python3", args: ["-m", "almasix.lsp", ...extra] });

  for (const candidate of candidates) {
    if (candidate.command.includes(path.sep) || candidate.command.includes("/")) {
      if (fs.existsSync(candidate.command)) return candidate;
      continue;
    }
    return candidate;
  }
  return undefined;
}

function resolvePython(configured: string): string | undefined {
  const root = workspaceRoot();
  let value = configured.trim();
  if (!value && root) {
    value = path.join(
      root,
      ".venv",
      process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
    );
  }
  if (!value) return undefined;
  value = value.replace(/\$\{workspaceFolder\}/g, root || "");
  if (fs.existsSync(value)) return value;
  return configured.trim() || undefined;
}
