/**
 * Pure presentation model for the Almasix Symbols tree (JetBrains Tool Window parity).
 */
import type { AlmasixIndex } from "./types";

export interface ToolWindowSummary {
  ok: boolean;
  error: string | null;
  views: number;
  routes: number;
  configKeys: number;
  components: number;
  tables: number;
  envKeys: number;
  gates: number;
  validationRules: number;
}

export interface SymbolRow {
  kind: string;
  name: string;
  detail: string;
}

export const ToolWindowModel = {
  summary(index: AlmasixIndex): ToolWindowSummary {
    return {
      ok: index.ok,
      error: index.error ?? null,
      views: Object.keys(index.views).length,
      routes: Object.keys(index.routes).length,
      configKeys: index.configKeys.size,
      components: Object.keys(index.components).length,
      tables: Object.keys(index.tables).length,
      envKeys: Object.keys(index.envKeys).length,
      gates: index.gates.size,
      validationRules: index.validationRules.size,
    };
  },

  statusLine(summary: ToolWindowSummary): string {
    if (summary.error != null) return `Index error: ${summary.error}`;
    if (!summary.ok) return "Index not ready";
    return (
      `OK — ${summary.views} views, ${summary.routes} routes, ` +
      `${summary.configKeys} config, ${summary.components} components, ` +
      `${summary.tables} tables`
    );
  },

  symbolRows(index: AlmasixIndex, query = ""): SymbolRow[] {
    const q = query.trim().toLowerCase();
    const match = (name: string) => q.length === 0 || name.toLowerCase().includes(q);
    const out: SymbolRow[] = [];
    for (const [name, route] of Object.entries(index.routes)) {
      if (match(name)) {
        out.push({
          kind: "route",
          name,
          detail: `${route.methods.join("|")} ${route.uri}`,
        });
      }
    }
    for (const [name, path] of Object.entries(index.views)) {
      if (match(name)) out.push({ kind: "view", name, detail: path });
    }
    for (const name of index.configKeys) {
      if (match(name)) out.push({ kind: "config", name, detail: "" });
    }
    for (const [name, path] of Object.entries(index.components)) {
      if (match(name)) out.push({ kind: "component", name, detail: path });
    }
    for (const name of Object.keys(index.envKeys)) {
      if (match(name)) out.push({ kind: "env", name, detail: "" });
    }
    for (const [name, table] of Object.entries(index.tables)) {
      if (match(name)) {
        out.push({
          kind: "table",
          name,
          detail: `${Object.keys(table.columns ?? {}).length} columns`,
        });
      }
    }
    for (const name of index.gates) {
      if (match(name)) out.push({ kind: "gate", name, detail: "" });
    }
    return out.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
  },
};

export const AlmasixToolWindowModel = ToolWindowModel;
