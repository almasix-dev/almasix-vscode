import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

export interface SmithLaunch {
  command: string;
  args: string[];
  cwd: string;
}

/**
 * Resolve how to invoke `smith` for an Almasix app root.
 */
export function resolveSmith(
  appRoot: string,
  opts: { smithPath?: string; pythonPath?: string } = {},
): SmithLaunch {
  const override = (opts.smithPath || "").trim();
  if (override) {
    return { command: override, args: [], cwd: appRoot };
  }
  const venvSmith = path.join(
    appRoot,
    ".venv",
    process.platform === "win32" ? "Scripts/smith.exe" : "bin/smith",
  );
  const venvPython =
    (opts.pythonPath || "").trim() ||
    path.join(
      appRoot,
      ".venv",
      process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
    );
  const smithScript = path.join(appRoot, "smith");

  if (fs.existsSync(venvSmith)) {
    return { command: venvSmith, args: [], cwd: appRoot };
  }
  if (fs.existsSync(venvPython) && fs.existsSync(smithScript)) {
    return { command: venvPython, args: [smithScript], cwd: appRoot };
  }
  if (fs.existsSync(smithScript)) {
    return { command: "python3", args: [smithScript], cwd: appRoot };
  }
  return { command: "smith", args: [], cwd: appRoot };
}

/**
 * Spawn smith with the given subcommand args; stream output to an output channel.
 */
export async function runSmith(
  appRoot: string,
  smithArgs: string[],
  opts: { smithPath?: string; pythonPath?: string; channel?: vscode.OutputChannel } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  const launch = resolveSmith(appRoot, opts);
  const args = [...launch.args, ...smithArgs];
  const channel =
    opts.channel ?? vscode.window.createOutputChannel("Almasix Smith");
  channel.show(true);
  channel.appendLine(`$ ${launch.command} ${args.join(" ")}`);

  return new Promise((resolve, reject) => {
    const child = spawn(launch.command, args, {
      cwd: launch.cwd,
      env: process.env,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stdout += text;
      channel.append(text);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderr += text;
      channel.append(text);
    });
    child.on("error", (err) => {
      channel.appendLine(String(err));
      reject(err);
    });
    child.on("close", (code) => {
      channel.appendLine(`\n[exit ${code ?? 0}]`);
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}
