/**
 * Project-level Almasix app root + cached index from `smith ide:index --json`.
 * Pure Node — no vscode dependency.
 */
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { buildIndexCommand, parse } from "./indexLoader";
import { AlmasixIndex } from "./types";

export interface IndexServiceOptions {
  workspaceRoot: string;
  smithPath?: string;
  pythonPath?: string;
  /** Max ms to wait for `smith ide:index --json` (default 60s). */
  timeoutMs?: number;
}

type ChangeListener = (index: AlmasixIndex) => void;

export class IndexService {
  private indexRef: AlmasixIndex = AlmasixIndex.empty("Index not built yet.");
  private listeners = new Set<ChangeListener>();
  private rebuilding: Promise<AlmasixIndex> | null = null;

  constructor(private readonly options: IndexServiceOptions) {}

  get index(): AlmasixIndex {
    return this.indexRef;
  }

  appRoot(): string | null {
    return findBootstrapRoot(this.options.workspaceRoot);
  }

  onDidChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  invalidate(): void {
    this.indexRef = AlmasixIndex.empty("Index invalidated.");
  }

  async rebuild(): Promise<AlmasixIndex> {
    if (this.rebuilding) return this.rebuilding;
    this.rebuilding = this.runRebuild().finally(() => {
      this.rebuilding = null;
    });
    return this.rebuilding;
  }

  private async runRebuild(): Promise<AlmasixIndex> {
    const root = this.appRoot();
    let built: AlmasixIndex;
    if (!root) {
      built = AlmasixIndex.empty(
        "No Almasix application found (missing bootstrap/app.py).",
      );
    } else {
      try {
        const cmd = buildIndexCommand(root, {
          smithPath: this.options.smithPath,
          pythonPath: this.options.pythonPath,
        });
        const json = await runCapture(cmd.command, cmd.args, cmd.cwd, this.options.timeoutMs ?? 60_000);
        built = parse(json);
        if (!built.basePath) built.basePath = root;
      } catch (err) {
        built = AlmasixIndex.empty(err instanceof Error ? err.message : String(err));
      }
    }
    this.indexRef = built;
    for (const listener of this.listeners) {
      try {
        listener(built);
      } catch {
        /* ignore listener errors */
      }
    }
    return built;
  }
}

export function findBootstrapRoot(start: string): string | null {
  let current: string | null = path.resolve(start);
  while (current) {
    if (fs.existsSync(path.join(current, "bootstrap", "app.py"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  const examples = path.join(start, "examples");
  if (fs.existsSync(examples) && fs.statSync(examples).isDirectory()) {
    const preferred = ["progress", "blog", "web", "deploy"];
    for (const name of preferred) {
      const candidate = path.join(examples, name);
      if (fs.existsSync(path.join(candidate, "bootstrap", "app.py"))) {
        return candidate;
      }
    }
    try {
      for (const child of fs.readdirSync(examples).sort()) {
        const candidate = path.join(examples, child);
        if (
          fs.statSync(candidate).isDirectory() &&
          fs.existsSync(path.join(candidate, "bootstrap", "app.py"))
        ) {
          return candidate;
        }
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function isIndexRelevant(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  const base = path.basename(normalized);
  return (
    normalized.includes("/routes/") ||
    normalized.includes("/config/") ||
    normalized.includes("/lang/") ||
    normalized.includes("/resources/views/") ||
    normalized.includes("/app/models/") ||
    normalized.includes("/database/migrations/") ||
    normalized.includes("/app/policies/") ||
    base.startsWith(".env") ||
    normalized.endsWith("/bootstrap/app.py")
  );
}

function runCapture(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`ide:index timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            stderr.trim() || stdout.trim() || `ide:index exited with code ${code}`,
          ),
        );
        return;
      }
      resolve(stdout);
    });
  });
}
