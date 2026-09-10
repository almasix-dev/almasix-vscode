# Almasix for VS Code / Cursor / VSCodium

Prism highlighting + snippets + **almasix-lsp** client.

## Install

1. Install **Almasix** from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=almasix.almasix),
   or download a `.vsix` from [GitHub Releases](https://github.com/almasix-dev/ide-support/releases)
   and use **Install from VSIX…**.
2. Open an Almasix app (directory with `bootstrap/app.py`). Ensure the project
   venv has the language server:

   ```bash
   pip install 'almasix[lsp]'
   ```

3. Optional: run `smith ide:install` in the app to write `.vscode/settings.json`
   (Prism associations + python path) and `extensions.json`.

## Develop / sideload

```bash
cd vscode
npm install
npm run package
# → almasix-0.x.x.vsix
```

`npm run package` syncs Prism assets from `../prism/` then runs
`npx @vscode/vsce package`.

## Docs

Framework docs: [Editor setup](https://almasix-dev.github.io/almasix/editor-setup/).
