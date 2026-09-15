import { describe, expect, it } from "vitest";
import { MakeCatalog } from "../makeCatalog";
import { PrismStructure } from "../prismStructure";
import { AlmasixIndex, SymbolKind } from "../types";

describe("makeCatalog", () => {
  it("builds model smith args with flags", () => {
    expect(MakeCatalog.modelSmithArgs("Post", { migration: true, factory: true })).toBe(
      "make:model Post -m -f",
    );
    expect(MakeCatalog.modelSmithArgs("Post", { all: true })).toBe("make:model Post -a");
  });
});

describe("prismStructure", () => {
  it("flags unclosed @if", () => {
    const issues = PrismStructure.analyze("@if(true)\n<p>x</p>\n");
    expect(issues.some((i) => i.message.includes("Unclosed @if"))).toBe(true);
  });
});

describe("AlmasixIndex", () => {
  it("knows routes", () => {
    const index = new AlmasixIndex({
      ok: true,
      routes: { home: { uri: "/", methods: ["GET"] } },
    });
    expect(index.known(SymbolKind.ROUTE, "home")).toBe(true);
    expect(index.known(SymbolKind.ROUTE, "missing")).toBe(false);
  });
});
