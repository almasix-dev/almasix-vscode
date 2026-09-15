/**
 * In-memory symbol index produced by `smith ide:index --json`.
 *
 * Name sets drive completions; Located / path maps drive Ctrl-click navigation.
 */

export enum SymbolKind {
  ROUTE = "ROUTE",
  VIEW = "VIEW",
  CONFIG = "CONFIG",
  TRANSLATION = "TRANSLATION",
  MIDDLEWARE = "MIDDLEWARE",
  ENV = "ENV",
  ENV_VALUE = "ENV_VALUE",
  TABLE = "TABLE",
  COLUMN = "COLUMN",
  RELATION = "RELATION",
  CAST = "CAST",
  GATE = "GATE",
  COMPONENT = "COMPONENT",
  VALIDATION = "VALIDATION",
  DISK = "DISK",
  QUEUE = "QUEUE",
  CACHE = "CACHE",
  MAILER = "MAILER",
  INERTIA = "INERTIA",
  SMITH = "SMITH",
  VITE = "VITE",
  DIRECTIVE = "DIRECTIVE",
  TEMPLATE_VAR = "TEMPLATE_VAR",
  CONTROLLER_ACTION = "CONTROLLER_ACTION",
  /** Instance attribute: ``user.name`` / ``auth().user().email``. */
  ATTR = "ATTR",
  /** Model list/dict keys: ``fillable`` / ``guarded`` / ``casts`` keys. */
  MODEL_ATTR = "MODEL_ATTR",
}

export interface Located {
  path?: string | null;
  line?: number;
}

export interface EnvEntry {
  path?: string | null;
  line?: number;
  kind?: string;
  detail?: string;
  usedBy?: string[];
}

export interface ViewVarEntry {
  path?: string | null;
  line?: number;
  kind?: string;
}

export interface RouteEntry {
  uri: string;
  methods: string[];
  path?: string | null;
  line?: number;
}

export interface TableEntry {
  columns?: Record<string, Located>;
  detail?: string;
  path?: string | null;
  line?: number;
  /** Articulate model class bound to this table (`User` for `users`). */
  model?: string | null;
}

export interface ModelEntry {
  fillable?: string[];
  guarded?: string[];
  hidden?: string[];
  casts?: Record<string, string>;
  relations?: string[];
  /** Relation method name → 0-based line in the model file. */
  relationLines?: Record<string, number>;
  module?: string;
  path?: string;
}

export interface AlmasixIndexFields {
  basePath?: string;
  ok?: boolean;
  error?: string | null;
  /** Dotted view name → absolute template path. */
  views?: Record<string, string>;
  routes?: Record<string, RouteEntry>;
  configKeys?: Set<string> | string[];
  /** Config file stem (`app`) → absolute path. */
  configFiles?: Record<string, string>;
  /** Dotted config key → declaration location (`app.env` → line of `"env"`). */
  configLocations?: Record<string, Located>;
  translationKeys?: Set<string> | string[];
  middlewareAliases?: Set<string> | string[];
  envKeys?: Record<string, EnvEntry>;
  /** Suggested values for env keys (``QUEUE_CONNECTION`` → sync/redis/…). */
  envOptions?: Record<string, string[]>;
  tables?: Record<string, TableEntry>;
  modelMetadata?: Record<string, ModelEntry>;
  relations?: Record<string, string[]>;
  casts?: Set<string> | string[];
  /** Component / x- tag name → path. */
  components?: Record<string, string>;
  gates?: Set<string> | string[];
  disks?: Set<string> | string[];
  queues?: Set<string> | string[];
  caches?: Set<string> | string[];
  mailers?: Set<string> | string[];
  inertiaPages?: Set<string> | string[];
  smithCommands?: Set<string> | string[];
  validationRules?: Set<string> | string[];
  directives?: Set<string> | string[];
  viewHelpers?: Record<string, ViewVarEntry>;
  viewShared?: Record<string, ViewVarEntry>;
  viewData?: Record<string, Record<string, ViewVarEntry>>;
  viteEntries?: Record<string, string>;
  controllerActions?: Record<string, string[]>;
}

function asSet(value: Set<string> | string[] | undefined): Set<string> {
  if (!value) return new Set();
  return value instanceof Set ? value : new Set(value);
}

export class AlmasixIndex {
  basePath: string;
  ok: boolean;
  error: string | null;
  views: Record<string, string>;
  routes: Record<string, RouteEntry>;
  configKeys: Set<string>;
  configFiles: Record<string, string>;
  configLocations: Record<string, Located>;
  translationKeys: Set<string>;
  middlewareAliases: Set<string>;
  envKeys: Record<string, EnvEntry>;
  envOptions: Record<string, string[]>;
  tables: Record<string, TableEntry>;
  modelMetadata: Record<string, ModelEntry>;
  relations: Record<string, string[]>;
  casts: Set<string>;
  components: Record<string, string>;
  gates: Set<string>;
  disks: Set<string>;
  queues: Set<string>;
  caches: Set<string>;
  mailers: Set<string>;
  inertiaPages: Set<string>;
  smithCommands: Set<string>;
  validationRules: Set<string>;
  directives: Set<string>;
  viewHelpers: Record<string, ViewVarEntry>;
  viewShared: Record<string, ViewVarEntry>;
  viewData: Record<string, Record<string, ViewVarEntry>>;
  viteEntries: Record<string, string>;
  controllerActions: Record<string, string[]>;

  constructor(init: AlmasixIndexFields = {}) {
    this.basePath = init.basePath ?? "";
    this.ok = init.ok ?? false;
    this.error = init.error ?? null;
    this.views = init.views ?? {};
    this.routes = init.routes ?? {};
    this.configKeys = asSet(init.configKeys);
    this.configFiles = init.configFiles ?? {};
    this.configLocations = init.configLocations ?? {};
    this.translationKeys = asSet(init.translationKeys);
    this.middlewareAliases = asSet(init.middlewareAliases);
    this.envKeys = init.envKeys ?? {};
    this.envOptions = init.envOptions ?? {};
    this.tables = init.tables ?? {};
    this.modelMetadata = init.modelMetadata ?? {};
    this.relations = init.relations ?? {};
    this.casts = asSet(init.casts);
    this.components = init.components ?? {};
    this.gates = asSet(init.gates);
    this.disks = asSet(init.disks);
    this.queues = asSet(init.queues);
    this.caches = asSet(init.caches);
    this.mailers = asSet(init.mailers);
    this.inertiaPages = asSet(init.inertiaPages);
    this.smithCommands = asSet(init.smithCommands);
    this.validationRules = asSet(init.validationRules);
    this.directives = asSet(init.directives);
    this.viewHelpers = init.viewHelpers ?? {};
    this.viewShared = init.viewShared ?? {};
    this.viewData = init.viewData ?? {};
    this.viteEntries = init.viteEntries ?? {};
    this.controllerActions = init.controllerActions ?? {};
  }

  static empty(error?: string | null): AlmasixIndex {
    return new AlmasixIndex({ ok: false, error: error ?? null });
  }

  known(kind: SymbolKind, name: string): boolean {
    switch (kind) {
      case SymbolKind.ROUTE:
        return Object.prototype.hasOwnProperty.call(this.routes, name);
      case SymbolKind.VIEW:
        return Object.prototype.hasOwnProperty.call(this.views, name);
      case SymbolKind.CONFIG:
        return this.configKeys.has(name);
      case SymbolKind.TRANSLATION:
        return this.translationKeys.size > 0 && this.translationKeys.has(name);
      case SymbolKind.MIDDLEWARE:
        return this.middlewareAliases.has(name);
      case SymbolKind.ENV:
        return Object.prototype.hasOwnProperty.call(this.envKeys, name);
      case SymbolKind.ENV_VALUE:
        return true;
      case SymbolKind.TABLE:
        return Object.prototype.hasOwnProperty.call(this.tables, name);
      case SymbolKind.GATE:
        return this.gates.has(name);
      case SymbolKind.COMPONENT:
        return (
          Object.prototype.hasOwnProperty.call(this.components, name) ||
          Object.prototype.hasOwnProperty.call(this.views, `components.${name}`)
        );
      case SymbolKind.VALIDATION: {
        const rule = name.split(":")[0] ?? name;
        return this.validationRules.has(rule);
      }
      case SymbolKind.DISK:
        return this.disks.has(name);
      case SymbolKind.QUEUE:
        return this.queues.has(name);
      case SymbolKind.CACHE:
        return this.caches.has(name);
      case SymbolKind.MAILER:
        return this.mailers.has(name);
      case SymbolKind.INERTIA:
        return this.inertiaPages.has(name);
      case SymbolKind.SMITH:
        return this.smithCommands.has(name);
      case SymbolKind.VITE:
        return (
          Object.prototype.hasOwnProperty.call(this.viteEntries, name) ||
          Object.prototype.hasOwnProperty.call(this.views, name)
        );
      case SymbolKind.CAST:
        return this.casts.has(name);
      case SymbolKind.TEMPLATE_VAR:
        return this.templateVarNames().has(name.split(".")[0] ?? name);
      case SymbolKind.CONTROLLER_ACTION: {
        const at = name.indexOf("@");
        const controller = at >= 0 ? name.slice(0, at) : name;
        const action = at >= 0 ? name.slice(at + 1) : "";
        if (Object.prototype.hasOwnProperty.call(this.controllerActions, name)) return true;
        if (Object.prototype.hasOwnProperty.call(this.controllerActions, controller) && action === "") {
          return true;
        }
        return this.controllerActions[controller]?.includes(action) === true;
      }
      case SymbolKind.COLUMN:
      case SymbolKind.RELATION:
      case SymbolKind.DIRECTIVE:
      case SymbolKind.ATTR:
      case SymbolKind.MODEL_ATTR:
        return true;
      default:
        return false;
    }
  }

  templateVarNames(): Set<string> {
    const names = new Set<string>([
      ...Object.keys(this.viewHelpers),
      ...Object.keys(this.viewShared),
    ]);
    for (const vars of Object.values(this.viewData)) {
      for (const key of Object.keys(vars)) names.add(key);
    }
    return names;
  }

  optionsForEnvKey(key: string): string[] {
    const direct = this.envOptions[key];
    if (direct) return direct;
    const aliases: Record<string, string> = {
      QUEUE_DRIVER: "QUEUE_CONNECTION",
      QUEUE_CONNECTION: "QUEUE_DRIVER",
      CACHE_DRIVER: "CACHE_STORE",
      CACHE_STORE: "CACHE_DRIVER",
      BROADCAST_DRIVER: "BROADCAST_CONNECTION",
      BROADCAST_CONNECTION: "BROADCAST_DRIVER",
    };
    const alt = aliases[key];
    if (!alt) return [];
    return this.envOptions[alt] ?? [];
  }

  viewNameForPath(absolutePath: string): string | null {
    if (!absolutePath.trim()) return null;
    const normalized = absolutePath.replace(/\\/g, "/");
    for (const [name, path] of Object.entries(this.views)) {
      if (path.replace(/\\/g, "/") === normalized) return name;
    }
    for (const [name, path] of Object.entries(this.views)) {
      const p = path.replace(/\\/g, "/");
      if (normalized.endsWith(p) || p.endsWith(normalized)) return name;
    }
    return null;
  }
}
