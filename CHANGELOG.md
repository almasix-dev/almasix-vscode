# Changelog

## 0.4.0

Native **Almasix Idea** parity for VS Code / Cursor / VSCodium via
`smith ide:index --json` (same brain as the JetBrains plugin):

- Completions (routes/views/config/env/ORM columns/…), Prism directive fallbacks,
  soft index, contains-prefix filter, bulk `MAIL_*` dotenv insert
- Go to Definition / Find References / Rename (incl. config leaf rewrite +
  view/component file moves)
- Hover docs; unknown-symbol + Prism `@if`/`@endif` Error diagnostics
  (quoted strings + `{{ template vars }}`)
- Document links (Ctrl/Cmd-hover underline)
- Code actions: create view/component, extract partial, include→`<x-`, relation stub
- Symbols tree: filter, status line, Routes/Views/Config/Components/Env/Tables/Gates
- **New…** / **New Model…** (`-a` or companions) + offline `FileTemplates` if smith fails
- Explorer folder context → New…; Task provider; status bar; file watchers
- `almasix.useLsp` default **false** (optional legacy LSP)
- esbuild-bundled `out/extension.js`; vitest core suite (53 tests)

See [PARITY.md](PARITY.md) for shared limitations (no goto for GATE / MIDDLEWARE /
VALIDATION / CAST / ATTR; TextMate vs native Prism lexer).

## 0.3.x

LSP client + Prism / dotenv language contributions (pre-native parity).
