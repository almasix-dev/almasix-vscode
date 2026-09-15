/**
 * Catalog of `smith make:*` generators for New… QuickPicks.
 */
export interface Generator {
  id: string;
  /** Menu label, e.g. "Controller". */
  label: string;
  /** Full smith subcommand, e.g. `make:controller`. */
  command: string;
  /** Dialog prompt when a name is required. Null → run with no extra args. */
  namePrompt?: string | null;
  description?: string;
  /** When true, the New… action shows companion-file checkboxes. */
  interactive?: boolean;
  smithArgs?(name: string | null | undefined): string;
}

export type MakeGenerator = Generator;

export interface ModelOptions {
  all?: boolean;
  migration?: boolean;
  factory?: boolean;
  seed?: boolean;
  controller?: boolean;
  resource?: boolean;
  api?: boolean;
  policy?: boolean;
  requests?: boolean;
}

function withSmithArgs(g: Generator): Generator {
  return {
    ...g,
    smithArgs(name: string | null | undefined): string {
      const trimmed = (name ?? "").trim();
      if (g.namePrompt == null || !trimmed) return g.command;
      return `${g.command} ${trimmed}`;
    },
  };
}

function gen(
  id: string,
  label: string,
  command: string,
  namePrompt: string | null = "Name",
  extras: Partial<Generator> = {},
): Generator {
  return withSmithArgs({ id, label, command, namePrompt, ...extras });
}

export const MakeCatalog = {
  ALL: [
    gen("controller", "Controller", "make:controller", "Controller name (e.g. PostController)"),
    gen("model", "Model", "make:model", "Model name (e.g. Post)", { interactive: true }),
    gen("migration", "Migration", "make:migration", "Migration name (e.g. create_posts_table)"),
    gen("view", "View", "make:view", "View name (e.g. posts.index)"),
    gen("component", "Component", "make:component", "Component name (e.g. alert)"),
    gen("command", "Command", "make:command", "Command name (e.g. SendDigest)"),
    gen("job", "Job", "make:job", "Job name (e.g. ProcessPodcast)"),
    gen("middleware", "Middleware", "make:middleware", "Middleware name (e.g. EnsureToken)"),
    gen("request", "Form Request", "make:request", "Request name (e.g. StorePostRequest)"),
    gen("resource", "API Resource", "make:resource", "Resource name (e.g. PostResource)"),
    gen("seeder", "Seeder", "make:seeder", "Seeder name (e.g. PostSeeder)"),
    gen("factory", "Factory", "make:factory", "Factory name (e.g. PostFactory)"),
    gen("test", "Test", "make:test", "Test name (e.g. PostTest)"),
    gen("mail", "Mailable", "make:mail", "Mailable name (e.g. OrderShipped)"),
    gen("notification", "Notification", "make:notification", "Notification name"),
    gen("event", "Event", "make:event", "Event name"),
    gen("listener", "Listener", "make:listener", "Listener name"),
    gen("policy", "Policy", "make:policy", "Policy name"),
    gen("provider", "Provider", "make:provider", "Provider name"),
    gen("exception", "Exception", "make:exception", "Exception name"),
    gen("enum", "Enum", "make:enum", "Enum name"),
    gen("rule", "Validation Rule", "make:rule", "Rule name"),
    gen("observer", "Observer", "make:observer", "Observer name"),
    gen("channel", "Channel", "make:channel", "Channel name"),
    gen("cast", "Cast", "make:cast", "Cast name"),
    gen("class", "Class", "make:class", "Class name / path"),
    gen("interface", "Interface", "make:interface", "Interface name"),
    gen("document", "Document Model", "make:document", "Document name"),
    gen("lang", "Lang Locale", "make:lang", "Locale code (e.g. fr)", {
      description: "Create lang/<locale>/",
    }),
    gen("package", "Package", "make:package", "Package name"),
  ] as Generator[],

  byId(id: string): Generator | undefined {
    return MakeCatalog.ALL.find((g) => g.id === id);
  },

  menuLabel(generator: Generator): string {
    return `New ${generator.label}…`;
  },

  modelSmithArgs(name: string, options: ModelOptions): string {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Model name required");
    if (options.all) return `make:model ${trimmed} -a`;
    const flags: string[] = [];
    if (options.migration) flags.push("-m");
    if (options.factory) flags.push("-f");
    if (options.seed) flags.push("-s");
    if (options.controller) flags.push("-c");
    if (options.resource) flags.push("-r");
    if (options.api) flags.push("--api");
    if (options.policy) flags.push("--policy");
    if (options.requests) flags.push("-R");
    return flags.length === 0
      ? `make:model ${trimmed}`
      : `make:model ${trimmed} ${flags.join(" ")}`;
  },
};

export const AlmasixMakeCatalog = MakeCatalog;
