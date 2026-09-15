import { describe, expect, it } from "vitest";
import { HoverDocs } from "../hoverDocs";
import { AlmasixIndex, SymbolKind } from "../types";

describe("HoverDocs", () => {
  it("documents routes", () => {
    const index = new AlmasixIndex({
      ok: true,
      routes: {
        home: { uri: "/", methods: ["GET"], path: "/r.py", line: 3 },
      },
    });
    expect(HoverDocs.forSymbol(index, SymbolKind.ROUTE, "home")).toContain("GET");
    expect(HoverDocs.forSymbol(index, SymbolKind.ROUTE, "nope")).toContain("Unknown");
    expect(HoverDocs.forSymbol(index, SymbolKind.ROUTE, "")).toBeNull();
  });

  it("documents directives", () => {
    expect(HoverDocs.directive("if")).toContain("@if");
    expect(HoverDocs.directive("not-a-directive")).toBeUndefined();
    expect(
      HoverDocs.forSymbol(new AlmasixIndex({ ok: true }), SymbolKind.DIRECTIVE, "if"),
    ).toContain("@if");
  });
});
