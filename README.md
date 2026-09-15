# Almasix for VS Code / Cursor / VSCodium

**0.4.0 — native Idea parity** driven by `smith ide:index --json`
(same intelligence as [Almasix Idea](../jetbrains/README.md)), not LSP by default.

## Features

- Prism (`.prism.html`) highlighting + snippets + dotenv language
- Completions for routes, views, config, env, components, gates, columns, …
- Go to Definition / Find References / Rename for indexed call-site symbols
- Hover docs + unknown-symbol / Prism structure diagnostics
- Document links (Ctrl/Cmd-hover underline) on navigable strings
- **Almasix** activity-bar Symbols tree (Routes, Views, Config, Components, Env, Tables, Gates)
- **Almasix: New…** / **New Model…** QuickPicks (`smith make:*`)
- Tasks: `serve`, `migrate`, `test`, `queue:work`
- Status bar: `Almasix · N routes · M views`
- Optional legacy LSP when `almasix.useLsp` is `true` (default **false**; VS Code–only)

See [PARITY.md](PARITY.md) for full parity notes and shared limitations
(no goto for GATE/MIDDLEWARE/VALIDATION/CAST/ATTR; TextMate Prism vs native lexer).

## Install

1. Install **Almasix** from the Marketplace, or a `.vsix` from
   [GitHub Releases](https://github.com/almasix-dev/ide-support/releases)
   (**Install from VSIX…**).
2. Open an Almasix app (`bootstrap/app.py`). Ensure the project can run:

   ```bash
   smith ide:index --json | head
   ```

3. Optional: `smith ide:install` to write `.vscode/settings.json` /
   `extensions.json`.

## Settings

| Setting | Default | Purpose |
|---------|---------|---------|
| `almasix.pythonPath` | `""` | Interpreter for smith / optional LSP |
| `almasix.smithPath` | `""` | Override smith binary |
| `almasix.useLsp` | `false` | Also start legacy `almasix-lsp` |

## Develop / sideload

```bash
cd vscode
npm install
npm run compile   # tsc --noEmit + esbuild bundle → out/extension.js
npm test          # vitest
npm run package   # → almasix-0.4.0.vsix (bundled; no --no-dependencies needed)
```

`npm run package` syncs Prism assets from `../prism/` then runs `@vscode/vsce package`.

## Docs

Framework docs: [Editor setup](https://almasix-dev.github.io/almasix/editor-setup/).
