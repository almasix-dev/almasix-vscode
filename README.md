# Almasix for VS Code / Cursor / VSCodium

**0.4.0 — native Idea parity** driven by `smith ide:index --json`
(same intelligence as [Almasix Idea](https://github.com/almasix-dev/almasix-idea)),
not LSP by default.

> Split from the former monorepo [`almasix-dev/ide-support`](https://github.com/almasix-dev/ide-support).
> JetBrains lives in [`almasix-dev/almasix-idea`](https://github.com/almasix-dev/almasix-idea).

## Features

- Prism (`.prism.html`) highlighting + snippets + dotenv language
- Completions for routes, views, config, env, components, gates, columns, …
- Go to Definition / Find References / Rename for indexed call-site symbols
- Hover docs + unknown-symbol / Prism structure diagnostics
- Document links (Ctrl/Cmd-hover underline) on navigable strings
- **Almasix** activity-bar Symbols tree
- **Almasix: New…** / **New Model…** QuickPicks (`smith make:*`)
- Tasks: `serve`, `migrate`, `test`, `queue:work`
- Status bar: `Almasix · N routes · M views`
- Optional legacy LSP when `almasix.useLsp` is `true` (default **false**)

See [PARITY.md](PARITY.md) for parity notes and shared limitations.

## Install

| Client | Where to install |
|--------|------------------|
| **VS Code** | [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=almasix.almasix) |
| **Cursor / VSCodium / Windsurf** | [Open VSX](https://open-vsx.org/extension/almasix/almasix) (Extensions search), or the same Marketplace ID if your client mirrors it |
| Any | `.vsix` from [GitHub Releases](https://github.com/almasix-dev/almasix-vscode/releases) → **Install from VSIX…** |

1. Install the extension (table above).
2. Open an Almasix app (`bootstrap/app.py`). Ensure:

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
npm install
npm run compile   # tsc --noEmit + esbuild → out/extension.js
npm test          # vitest
npm run package   # → almasix-0.x.x.vsix
```

`npm run package` syncs Prism assets from [`prism/`](prism/) then runs `@vscode/vsce package`.

## Release

Create a GitHub Release on a `vX.Y.Z` tag. The [publish workflow](.github/workflows/publish.yml)
builds the VSIX, attaches it to the Release, and publishes to **both** the
Visual Studio Marketplace and [Open VSX](https://open-vsx.org/extension/almasix/almasix)
(so Cursor / VSCodium can find it in Extensions search).

Secrets (Actions):

| Secret | Purpose |
|--------|---------|
| `VSCE_PAT` | Azure DevOps PAT with Marketplace Publish for publisher `almasix` |
| `OVSX_PAT` | Open VSX token from [user-settings/tokens](https://open-vsx.org/user-settings/tokens) |

One-time Open VSX setup (before the first publish):

1. Sign in at [open-vsx.org](https://open-vsx.org) (Eclipse account).
2. Create a token; store it as the `OVSX_PAT` repo secret.
3. Create the publisher namespace once:

   ```bash
   npx ovsx create-namespace almasix -p "$OVSX_PAT"
   ```

## Docs

Framework docs: [Editor setup](https://almasix-dev.github.io/almasix/editor-setup/).
