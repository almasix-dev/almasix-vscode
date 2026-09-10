# Prism language assets

Shared editor assets for Almasix **Prism** templates (`.prism.html`): TextMate
grammar, language configuration, snippets, and a minimal tree-sitter grammar.

VS Code and JetBrains packages in this repo consume these files (`vscode/`
syncs via `npm run sync-prism`). The Python formatter (`format_prism` /
`smith prism:format`) lives in the
[almasix](https://github.com/almasix-dev/almasix) framework, not here.

## Layout

| Path | Role |
| --- | --- |
| `syntaxes/prism.tmLanguage.json` | TextMate grammar |
| `language-configuration.json` | Comments, brackets, folding, indent |
| `snippets/prism.code-snippets` | Directive + `x-component` snippets |
| `tree-sitter-prism/` | Minimal tree-sitter grammar + queries |

## Tree-sitter

```bash
npm install -g tree-sitter-cli
cd tree-sitter-prism
tree-sitter generate
tree-sitter build
```

Highlight queries: `tree-sitter-prism/queries/highlights.scm`.
