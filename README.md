# Almasix for VS Code / Cursor / VSCodium

Native editor intelligence for [Almasix](https://github.com/almasix-dev/almasix)
applications — Prism templates, completions, navigation, rename, diagnostics,
and Smith helpers — driven by the same project index as
[Almasix Idea](https://github.com/almasix-dev/almasix-idea).

| | |
| --- | --- |
| **Marketplace** | [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=almasix.almasix) |
| **Open VSX** | [open-vsx.org/extension/almasix/almasix](https://open-vsx.org/extension/almasix/almasix) (Cursor / VSCodium / Windsurf) |
| **Releases** | [GitHub Releases](https://github.com/almasix-dev/almasix-vscode/releases) (`.vsix`) |
| **Framework docs** | [Editor setup](https://almasix-dev.github.io/almasix/editor-setup/) · [Prism](https://almasix-dev.github.io/almasix/prism/) · [Language server](https://almasix-dev.github.io/almasix/language-server/) |
| **Sister plugin** | [almasix-idea](https://github.com/almasix-dev/almasix-idea) (PyCharm / WebStorm) |

> Split from the former monorepo [`almasix-dev/ide-support`](https://github.com/almasix-dev/ide-support)
> (redirect only). JetBrains lives in [`almasix-idea`](https://github.com/almasix-dev/almasix-idea).

---

## How it works

```text
Almasix app (bootstrap/app.py)
        │
        ▼
  smith ide:index --json     ← boots the app, dumps routes / views / config / …
        │
        ▼
  IndexService (extension)   ← caches dump, watches files, rebuilds on change
        │
        ├── Completions / Hover / Definition / References / Rename
        ├── Diagnostics (unknown symbols + Prism structure)
        ├── Document links + Symbols tree + status bar
        └── Optional: almasix-lsp  (almasix.useLsp = true; default off)
```

1. You open a folder that contains `bootstrap/app.py`.
2. The extension runs `smith ide:index --json` (via the project interpreter) and
   caches the dump.
3. Language providers answer from that cache — the same intelligence model as
   Almasix Idea, not LSP by default.
4. File watchers and **Almasix: Rebuild Index** keep the cache fresh.

The optional legacy [language server](https://almasix-dev.github.io/almasix/language-server/)
(`almasix-lsp`) is for editors that only speak LSP, or for side-by-side
comparison. Leave `almasix.useLsp` at `false` for normal use.

Framework overview: [Editor setup](https://almasix-dev.github.io/almasix/editor-setup/).
Parity with JetBrains: [PARITY.md](PARITY.md).

---

## Requirements

- **VS Code** 1.85+, **Cursor**, **VSCodium**, or another VS Code–compatible client
- An Almasix app with `bootstrap/app.py` at the workspace root (or a nested app
  you open as the folder)
- **Almasix** installed on the interpreter the extension uses
  (prefer **0.9.1+**; current line **0.9.3+** for latest kit/index behavior)

```bash
# from the application root, with the project venv active
pip install -U almasix
smith ide:index --json | head
```

If index fails, the status bar will not show route/view counts — fix the
interpreter path first (see [Troubleshooting](#troubleshooting)).

---

## Install

| Client | Install from |
| --- | --- |
| **VS Code** | [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=almasix.almasix) |
| **Cursor / VSCodium / Windsurf** | [Open VSX](https://open-vsx.org/extension/almasix/almasix) (Extensions search), or Marketplace if your client mirrors it |
| Any | `.vsix` from [Releases](https://github.com/almasix-dev/almasix-vscode/releases) → **Install from VSIX…** |

Then, in the app root:

```bash
smith ide:install    # writes .vscode/settings.json + extensions.json
smith ide:stubs      # optional .pyi for models + route name Literal
```

Confirm the status bar shows **Almasix · N routes · M views**.

---

## Features

### Prism (`.prism.html`)

- Language id `prism-html` with TextMate highlighting, snippets, and Emmet-friendly
  associations from `smith ide:install`
- Structure diagnostics for unmatched `@if` / `@endif` (and related pairs);
  inline `@section('name', 'value')` is self-closing; `@show` closes `@section`
- Official Prism mark as the **language** icon; optional **Almasix File Icons**
  theme for explorer icons (Seti / Material often treat `*.prism.html` as HTML)

See [Prism language support](https://almasix-dev.github.io/almasix/prism-language/)
and the [Prism guide](https://almasix-dev.github.io/almasix/prism/).

### Project intelligence (from `ide:index`)

Completions, hover, go to definition, find references, and rename for indexed
call-site symbols, including:

- Named **routes**, **views**, **config** keys, **env** keys
- Prism **components**, **gates**, tables / **columns**, Articulate relations
- Dotenv language + two-way env completion (keys from config; driver options)

Unknown-symbol diagnostics and Ctrl/Cmd-hover **document links** on navigable
strings. Soft-known-only surfaces (e.g. some gate / middleware / validation
tokens) get completions without go-to-definition — see [PARITY.md](PARITY.md).

### UI and generators

| Surface | What it does |
| --- | --- |
| **Almasix** activity bar | Searchable Symbols tree |
| **Almasix: New…** | QuickPick over `smith make:*` |
| **Almasix: New Model…** | Interactive `make:model` companions (`-a`, etc.) |
| **Almasix: Rebuild Index** | Force `smith ide:index --json` |
| **Almasix: Show Application Info** | App / index summary |
| Tasks | `serve`, `migrate`, `test`, `queue:work` |
| Status bar | `Almasix · N routes · M views` |

### Code actions

Create missing view / component, extract Prism partial, `@include` → `<x-… />`,
relation method stub, and related Alt-Enter / lightbulb actions.

---

## Settings

| Setting | Default | Purpose |
| --- | --- | --- |
| `almasix.pythonPath` | `""` | Interpreter for smith / optional LSP (set to `.venv/bin/python` or WSL Linux path) |
| `almasix.smithPath` | `""` | Override smith binary |
| `almasix.useLsp` | `false` | Also start legacy `almasix-lsp` |
| `almasix.lsp.command` / `args` | — | Only when `useLsp` is true |

`smith ide:install` typically writes:

- `files.associations`: `*.prism.html` → `prism-html`
- `almasix.pythonPath`: `${workspaceFolder}/.venv/bin/python`
- Emmet / format-on-save for Prism

### Prism file icons

Explorer icons follow the active **File Icon Theme**. To show the Prism mark:

- **Command Palette → Preferences: File Icon Theme → Almasix File Icons**, or
- Keep your theme and associate the compound extension (e.g. Material Icon Theme):

  ```json
  "material-icon-theme.files.associations": {
    "*.prism.html": "blade"
  }
  ```

---

## Commands

| Command | ID |
| --- | --- |
| Rebuild Index | `almasix.rebuildIndex` |
| New… | `almasix.newGenerator` |
| New Model… | `almasix.newModel` |
| Show Application Info | `almasix.showAppInfo` |
| Filter Symbols | `almasix.filterSymbols` |
| Restart / Restart Server | `almasix.restart` / `almasix.restartServer` |

---

## Troubleshooting

**Status bar empty / index fails**

- Run `smith ide:index --json` in a terminal with the project venv active.
- Set `almasix.pythonPath` to that interpreter.
- On Windows + WSL: open the folder via **Remote – WSL**, use the Linux `.venv`,
  and point `almasix.pythonPath` at `/home/…/.venv/bin/python` — not the
  Windows Store `python3` stub.

**Cursor can’t find the extension**

- Cursor uses **Open VSX**, not the Visual Studio Marketplace. Install from
  [Open VSX](https://open-vsx.org/extension/almasix/almasix) or a Release `.vsix`.

**Prism looks like plain HTML**

- Confirm `files.associations` maps `*.prism.html` → `prism-html`.
- Run `smith ide:install` or set the association manually.

**Stale completions after big refactors**

- **Almasix: Rebuild Index**, or touch a watched file under the app.

More context: [Editor setup](https://almasix-dev.github.io/almasix/editor-setup/).

---

## Develop / sideload

```bash
npm install
npm run compile   # tsc --noEmit + esbuild → out/extension.js
npm test          # vitest
npm run package   # → almasix-0.x.x.vsix
```

`npm run package` syncs Prism assets from [`prism/`](prism/) then runs
`@vscode/vsce package`.

---

## Release

Create a GitHub Release on a `vX.Y.Z` tag. The
[publish workflow](.github/workflows/publish.yml) builds the VSIX, attaches it
to the Release, and publishes to the **Visual Studio Marketplace** and
[Open VSX](https://open-vsx.org/extension/almasix/almasix).

| Secret | Purpose |
| --- | --- |
| `VSCE_PAT` | Azure DevOps PAT (Marketplace Publish) for publisher `almasix` |
| `OVSX_PAT` | [Open VSX token](https://open-vsx.org/user-settings/tokens) |

One-time Open VSX namespace (before first publish):

```bash
npx ovsx create-namespace almasix -p "$OVSX_PAT"
```

---

## Documentation map

| Topic | Where |
| --- | --- |
| Install both IDEs + `ide:install` / `ide:index` / stubs | [Editor setup](https://almasix-dev.github.io/almasix/editor-setup/) |
| Prism templates (directives, layouts, components) | [Prism](https://almasix-dev.github.io/almasix/prism/) |
| Grammars, formatter, snippets | [Prism language support](https://almasix-dev.github.io/almasix/prism-language/) |
| Optional `almasix-lsp` | [Language server](https://almasix-dev.github.io/almasix/language-server/) |
| Smith CLI | [Console](https://almasix-dev.github.io/almasix/console/) |
| Framework install | [Installation](https://almasix-dev.github.io/almasix/installation/) |
| VS Code ↔ JetBrains feature matrix | [PARITY.md](PARITY.md) |
| JetBrains plugin | [almasix-idea](https://github.com/almasix-dev/almasix-idea) |
| Framework source | [almasix-dev/almasix](https://github.com/almasix-dev/almasix) |

License: [MIT](LICENSE).
