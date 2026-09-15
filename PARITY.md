# VS Code ↔ JetBrains parity (0.4.0)

Checklist mapping **Almasix Idea** features to this extension.

## Full parity (core intelligence + providers)

After recent fixes, VS Code matches JetBrains for the shared pure-logic core and
provider surfaces:

| JetBrains feature | VS Code | Status |
|-------------------|---------|--------|
| `smith ide:index --json` project index | `IndexService` + activate rebuild | full parity |
| Completions (routes/views/config/env/…, Prism fallbacks) | `CompletionItemProvider` | full parity |
| Go to Declaration (incl. template vars) | `DefinitionProvider` | full parity |
| Find Usages | `ReferenceProvider` | full parity |
| Safe Rename (incl. config leaf rewrite, view move) | `RenameProvider` | full parity |
| Hover / Quick Doc | `HoverProvider` | full parity |
| Unknown-symbol annotations (incl. template vars) | diagnostics (debounced) | full parity |
| Prism structure (`@if`/`@endif`, Error severity) | diagnostics | full parity |
| Ctrl-hover underline on navigable symbols | `DocumentLinkProvider` | full parity |
| Code actions (create view/component, smith make) | `CodeActionProvider` | full parity |
| Extract Prism partial / include→component | code actions + commands | full parity |
| Relation method stub | code action command | full parity |
| Almasix Tool Window (filter + status line) | TreeView `almasixSymbols` | full parity |
| Almasix → New… / explorer New context | `almasix.newGenerator` QuickPick | full parity |
| Interactive `make:model` (`-a` / companions) | `almasix.newModel` multi-select | full parity |
| Rebuild Index | `almasix.rebuildIndex` | full parity |
| Index file watchers | `FileSystemWatcher` | full parity |
| Status / index health | status bar `Almasix · N routes · M views` | full parity |
| Smith run configs | TaskProvider `almasix` | full parity |
| Prism file type + highlighting | TextMate + language contrib | full parity\* |
| Dotenv language + env completion | dotenv lang + completions | full parity |
| Two-way env / bulk `MAIL_*` insert | `EnvBulkInsert` in completions | full parity |
| Articulate / ORM column completion | `CompletionCatalog` + `ModelResolver` | full parity |
| Offline `FileTemplates` fallback | `FileTemplates` | full parity |

\*Highlighting uses TextMate grammars here vs JetBrains’ native Prism lexer (same
language surface; different engine).

## Shared limitations (both IDEs)

- **No Go to Declaration** for `GATE` / `MIDDLEWARE` / `VALIDATION` / `CAST` /
  `ATTR` (completions + soft-known only; resolver returns null).
- Prism: VS Code **TextMate** vs JetBrains **native lexer** — token fidelity can
  differ at edges.

## VS Code–only

| Feature | Notes |
|---------|--------|
| Optional legacy LSP | `almasix.useLsp` (default **false**) |

See also [jetbrains/README.md](https://github.com/almasix-dev/almasix-idea).
