import { CompletionCatalog } from "./completionCatalog";
import { ModelResolver } from "./modelResolver";
import type { AlmasixIndex } from "./types";
import { SymbolKind } from "./types";

/**
 * Hover / quick-doc text for Almasix symbols and Prism directives.
 */
export const HoverDocs = {
  /** Baseline Prism directive docs (without leading `@`). */
  DIRECTIVES: {
    if: "`@if(condition)` — conditional block; close with `@endif`.",
    elseif: "`@elseif(condition)` — else-if branch inside `@if`.",
    else: "`@else` — final branch inside `@if` / `@unless`.",
    endif: "`@endif` — closes an `@if` block.",
    unless: "`@unless(condition)` — inverted conditional; close with `@endunless`.",
    endunless: "`@endunless` — closes an `@unless` block.",
    foreach: "`@foreach(items as item)` — iterate a collection; `@endforeach`.",
    endforeach: "`@endforeach` — closes a `@foreach` block.",
    forelse: "`@forelse(items as item)` — foreach with `@empty` / `@endforelse`.",
    endforelse: "`@endforelse` — closes a `@forelse` block.",
    for: "`@for(...)` — loop; `@endfor`.",
    endfor: "`@endfor` — closes an `@for` block.",
    while: "`@while(condition)` — while loop; `@endwhile`.",
    endwhile: "`@endwhile` — closes a `@while` block.",
    extends: "`@extends('layout')` — inherit a layout view.",
    include: "`@include('partial')` — render another view inline.",
    component: "`@component('name')` — component; `@endcomponent`.",
    endcomponent: "`@endcomponent` — closes a `@component` block.",
    section: "`@section('name')` — layout section; `@endsection` / `@show`.",
    endsection: "`@endsection` — closes a `@section` block.",
    yield: "`@yield('name')` — render a section from a child view.",
    csrf: "`@csrf` — hidden CSRF token field.",
    vite: "`@vite(['app.js'])` — Vite entry tags.",
    route: "`@route('name')` — named route URL.",
    auth: "`@auth` — render when authenticated; `@endauth`.",
    guest: "`@guest` — render for guests; `@endguest`.",
    can: "`@can('ability')` — authorization gate; `@endcan`.",
    lang: "`@lang('key')` — translate a key.",
    props: "`@props({…})` — declare component props with defaults.",
    slot: "`@slot('name')` — named slot body; `@endslot`.",
    push: "`@push('stack')` — append to a stack; `@endpush`.",
    stack: "`@stack('name')` — render a named stack.",
    python: "`@python` — embedded Python block; `@endpython`.",
  } as Readonly<Record<string, string>>,

  directive(name: string): string | undefined {
    return HoverDocs.DIRECTIVES[name];
  },

  forSymbol(
    index: AlmasixIndex,
    kind: SymbolKind,
    name: string,
    receiver?: string | null,
  ): string | null {
    if (!name.trim()) return null;
    switch (kind) {
      case SymbolKind.ROUTE: {
        const route = index.routes[name];
        if (!route) return `**route** \`${name}\`\n\n_Unknown named route._`;
        const methods = route.methods.join(" | ");
        const loc = route.path ? `\n\n\`${route.path}:${(route.line ?? 0) + 1}\`` : "";
        return `**route** \`${name}\`\n\n\`${methods}\` \`${route.uri}\`${loc}`;
      }
      case SymbolKind.VIEW: {
        const p = index.views[name];
        if (!p) return `**view** \`${name}\`\n\n_Not found in resources/views._`;
        return `**view** \`${name}\`\n\n\`${p}\``;
      }
      case SymbolKind.CONFIG: {
        const known = index.configKeys.has(name);
        const status = known ? "indexed" : "not in config/*.py";
        const loc = index.configLocations[name]?.path
          ? `\n\n\`${index.configLocations[name]!.path}\``
          : "";
        return `**config** \`${name}\`\n\n${status}${loc}`;
      }
      case SymbolKind.ENV: {
        const entry = index.envKeys[name];
        if (!entry) return `**env** \`${name}\`\n\n_Unknown key._`;
        const detail =
          entry.detail && entry.detail.trim()
            ? entry.detail
            : entry.kind && entry.kind.trim()
              ? entry.kind
              : "env";
        const loc = entry.path ? `\n\n\`${entry.path}:${(entry.line ?? 0) + 1}\`` : "";
        return `**env** \`${name}\`\n\n${detail}${loc}`;
      }
      case SymbolKind.COMPONENT: {
        const p = index.components[name] ?? index.views[`components.${name}`];
        if (!p) return `**component** \`${name}\`\n\n_Not found._`;
        return `**component** \`${name}\`\n\n\`${p}\``;
      }
      case SymbolKind.RELATION: {
        const rels = CompletionCatalog.relationsFor(index, receiver);
        if (rels.has(name)) {
          return `**relation** \`${name}\`${receiver ? ` on \`${receiver}\`` : ""}`;
        }
        return `**relation** \`${name}\`\n\n_Unknown relation._`;
      }
      case SymbolKind.COLUMN:
      case SymbolKind.ATTR:
      case SymbolKind.MODEL_ATTR: {
        const cols = ModelResolver.columnsFor(index, receiver);
        if (cols.has(name)) {
          return `**column** \`${name}\`${receiver ? ` (${receiver})` : ""}`;
        }
        return `**column** \`${name}\`\n\n_Unknown column._`;
      }
      case SymbolKind.TEMPLATE_VAR: {
        const root = name.includes(".") ? name.slice(0, name.indexOf(".")) : name;
        if (index.templateVarNames().has(root)) {
          return `**template var** \`${name}\``;
        }
        return `**template var** \`${name}\`\n\n_Unknown in view data / shared / helpers._`;
      }
      case SymbolKind.DIRECTIVE:
        return HoverDocs.directive(name) ?? null;
      default:
        if (index.known(kind, name)) return `**${kind.toLowerCase()}** \`${name}\``;
        return null;
    }
  },
};

export const AlmasixHoverDocs = HoverDocs;
