/**
 * Parses `smith ide:index --json` dumps and builds the index command line.
 * Stub — replace with full port from JetBrains AlmasixIndexLoader.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { AlmasixIndex, type AlmasixIndexFields } from "./types";

export interface IndexCommand {
  command: string;
  args: string[];
  cwd: string;
}

export function parse(json: string): AlmasixIndex {
  let root: Record<string, unknown>;
  try {
    root = JSON.parse(json) as Record<string, unknown>;
  } catch (err) {
    return AlmasixIndex.empty(`Invalid ide:index JSON: ${String(err)}`);
  }
  const fields: AlmasixIndexFields = {
    basePath: typeof root.base_path === "string" ? root.base_path : "",
    ok: root.ok === true,
    error: typeof root.error === "string" ? root.error : null,
    views: asStringMap(root.views),
    routes: asRoutes(root.routes),
    configKeys: asStringList(root.config_keys),
    configFiles: asStringMap(root.config_files),
    configLocations: asLocatedMap(root.config_locations),
    translationKeys: asStringList(root.translation_keys),
    middlewareAliases: asStringList(root.middleware_aliases),
    envKeys: asEnvKeys(root.env_keys),
    envOptions: asStringListMap(root.env_options),
    tables: asTables(root.tables),
    modelMetadata: asModelMetadata(root.model_metadata),
    relations: asStringListMap(root.relations),
    casts: asStringList(root.casts),
    components: asStringMap(root.components),
    gates: asStringList(root.gates),
    disks: asStringList(root.disks),
    queues: asStringList(root.queues),
    caches: asStringList(root.caches),
    mailers: asStringList(root.mailers),
    inertiaPages: asStringList(root.inertia_pages),
    smithCommands: asStringList(root.smith_commands),
    validationRules: asStringList(root.validation_rules),
    directives: asStringList(root.directives),
    viewHelpers: asViewVarMap(root.view_helpers),
    viewShared: asViewVarMap(root.view_shared),
    viewData: asViewData(root.view_data),
    viteEntries: asStringMap(root.vite_entries),
    controllerActions: asStringListMap(root.controller_actions),
  };
  // Merge relations from model_metadata when top-level relations absent.
  if (!root.relations && fields.modelMetadata) {
    const rels: Record<string, string[]> = {};
    for (const [name, meta] of Object.entries(fields.modelMetadata)) {
      if (meta.relations?.length) rels[name] = meta.relations;
    }
    fields.relations = { ...fields.relations, ...rels };
  }
  return new AlmasixIndex(fields);
}

export function buildIndexCommand(
  root: string,
  opts: { smithPath?: string; pythonPath?: string } = {},
): IndexCommand {
  const cwd = root;
  const smithOverride = (opts.smithPath || "").trim();
  if (smithOverride) {
    return { command: smithOverride, args: ["ide:index", "--json"], cwd };
  }
  const venvSmith = path.join(root, ".venv", process.platform === "win32" ? "Scripts/smith.exe" : "bin/smith");
  const venvPython =
    (opts.pythonPath || "").trim() ||
    path.join(root, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  const smithScript = path.join(root, "smith");
  if (fs.existsSync(venvSmith)) {
    return { command: venvSmith, args: ["ide:index", "--json"], cwd };
  }
  if (fs.existsSync(venvPython) && fs.existsSync(smithScript)) {
    return { command: venvPython, args: [smithScript, "ide:index", "--json"], cwd };
  }
  if (fs.existsSync(venvPython)) {
    return { command: venvPython, args: ["-m", "almasix.ide", "--path", root], cwd };
  }
  if (fs.existsSync(smithScript)) {
    return { command: "python3", args: [smithScript, "ide:index", "--json"], cwd };
  }
  return { command: "smith", args: ["ide:index", "--json"], cwd };
}

function asStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = typeof v === "string" ? v : String(v);
  }
  return out;
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value && typeof value === "object") return Object.keys(value as object);
  return [];
}

function asStringListMap(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = Array.isArray(v) ? v.map(String) : [];
  }
  return out;
}

function asLocatedMap(value: unknown): AlmasixIndexFields["configLocations"] {
  if (!value || typeof value !== "object") return {};
  const out: NonNullable<AlmasixIndexFields["configLocations"]> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const obj = v as Record<string, unknown>;
    out[k] = {
      path: typeof obj.path === "string" ? obj.path : null,
      line: typeof obj.line === "number" ? obj.line : 0,
    };
  }
  return out;
}

function asRoutes(value: unknown): AlmasixIndexFields["routes"] {
  if (!value || typeof value !== "object") return {};
  const out: NonNullable<AlmasixIndexFields["routes"]> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const obj = v as Record<string, unknown>;
    out[k] = {
      uri: typeof obj.uri === "string" ? obj.uri : "",
      methods: Array.isArray(obj.methods) ? obj.methods.map(String) : [],
      path: typeof obj.path === "string" ? obj.path : null,
      line: typeof obj.line === "number" ? obj.line : 0,
    };
  }
  return out;
}

function asEnvKeys(value: unknown): AlmasixIndexFields["envKeys"] {
  if (!value || typeof value !== "object") return {};
  const out: NonNullable<AlmasixIndexFields["envKeys"]> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const obj = v as Record<string, unknown>;
    out[k] = {
      path: typeof obj.path === "string" ? obj.path : null,
      line: typeof obj.line === "number" ? obj.line : 0,
      kind: typeof obj.kind === "string" ? obj.kind : "",
      detail: typeof obj.detail === "string" ? obj.detail : "",
      usedBy: Array.isArray(obj.used_by) ? obj.used_by.map(String) : [],
    };
  }
  return out;
}

function asTables(value: unknown): AlmasixIndexFields["tables"] {
  if (!value || typeof value !== "object") return {};
  const out: NonNullable<AlmasixIndexFields["tables"]> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const obj = v as Record<string, unknown>;
    const columns: Record<string, { path?: string | null; line?: number }> = {};
    if (obj.columns && typeof obj.columns === "object") {
      for (const [ck, cv] of Object.entries(obj.columns as Record<string, unknown>)) {
        if (cv && typeof cv === "object") {
          const col = cv as Record<string, unknown>;
          columns[ck] = {
            path: typeof col.path === "string" ? col.path : null,
            line: typeof col.line === "number" ? col.line : 0,
          };
        }
      }
    }
    out[k] = {
      columns,
      detail: typeof obj.detail === "string" ? obj.detail : "",
      path: typeof obj.path === "string" ? obj.path : null,
      line: typeof obj.line === "number" ? obj.line : 0,
      model: typeof obj.model === "string" ? obj.model : null,
    };
  }
  return out;
}

function asModelMetadata(value: unknown): AlmasixIndexFields["modelMetadata"] {
  if (!value || typeof value !== "object") return {};
  const out: NonNullable<AlmasixIndexFields["modelMetadata"]> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const obj = v as Record<string, unknown>;
    const casts: Record<string, string> = {};
    if (obj.casts && typeof obj.casts === "object") {
      for (const [ck, cv] of Object.entries(obj.casts as Record<string, unknown>)) {
        casts[ck] = String(cv);
      }
    }
    const relationLines: Record<string, number> = {};
    if (obj.relation_lines && typeof obj.relation_lines === "object") {
      for (const [rk, rv] of Object.entries(obj.relation_lines as Record<string, unknown>)) {
        relationLines[rk] = typeof rv === "number" ? rv : 0;
      }
    }
    out[k] = {
      fillable: Array.isArray(obj.fillable) ? obj.fillable.map(String) : [],
      guarded: Array.isArray(obj.guarded) ? obj.guarded.map(String) : [],
      hidden: Array.isArray(obj.hidden) ? obj.hidden.map(String) : [],
      casts,
      relations: Array.isArray(obj.relations) ? obj.relations.map(String) : [],
      relationLines,
      module: typeof obj.module === "string" ? obj.module : "",
      path: typeof obj.path === "string" ? obj.path : "",
    };
  }
  return out;
}

function asViewVarMap(value: unknown): AlmasixIndexFields["viewHelpers"] {
  if (Array.isArray(value)) {
    const out: NonNullable<AlmasixIndexFields["viewHelpers"]> = {};
    for (const el of value) {
      if (!el || typeof el !== "object") continue;
      const obj = el as Record<string, unknown>;
      const name = typeof obj.name === "string" ? obj.name : null;
      if (!name) continue;
      out[name] = {
        path: typeof obj.path === "string" ? obj.path : null,
        line: typeof obj.line === "number" ? obj.line : 0,
        kind: typeof obj.kind === "string" ? obj.kind : "data",
      };
    }
    return out;
  }
  if (!value || typeof value !== "object") return {};
  const out: NonNullable<AlmasixIndexFields["viewHelpers"]> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v && typeof v === "object") {
      const obj = v as Record<string, unknown>;
      out[k] = {
        path: typeof obj.path === "string" ? obj.path : null,
        line: typeof obj.line === "number" ? obj.line : 0,
        kind: typeof obj.kind === "string" ? obj.kind : "shared",
      };
    } else {
      out[k] = { kind: "shared" };
    }
  }
  return out;
}

function asViewData(value: unknown): AlmasixIndexFields["viewData"] {
  if (!value || typeof value !== "object") return {};
  const out: NonNullable<AlmasixIndexFields["viewData"]> = {};
  for (const [view, vars] of Object.entries(value as Record<string, unknown>)) {
    out[view] = asViewVarMap(vars) ?? {};
  }
  return out;
}

/** Object-style API matching JetBrains AlmasixIndexLoader. */
export const IndexLoader = {
  parse,
  buildIndexCommand,
};

export const AlmasixIndexLoader = IndexLoader;
