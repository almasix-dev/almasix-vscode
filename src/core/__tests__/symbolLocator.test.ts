import { describe, expect, it } from "vitest";
import { SymbolLocator } from "../symbolLocator";
import { SymbolKind } from "../types";

describe("SymbolLocator.hitAt", () => {
  it("hits quoted route names", () => {
    const text = `return route("home")`;
    const offset = text.indexOf("home") + 1;
    const hit = SymbolLocator.hitAt(text, offset);
    expect(hit).not.toBeNull();
    expect(hit!.kind).toBe(SymbolKind.ROUTE);
    expect(hit!.name).toBe("home");
  });

  it("hits template vars inside {{ }}", () => {
    const text = `Hello {{ title }} world`;
    const offset = text.indexOf("title") + 2;
    const hit = SymbolLocator.hitAt(text, offset);
    expect(hit).not.toBeNull();
    expect(hit!.kind).toBe(SymbolKind.TEMPLATE_VAR);
    expect(hit!.name).toBe("title");
  });

  it("returns null for out-of-range offsets", () => {
    expect(SymbolLocator.hitAt("abc", -1)).toBeNull();
    expect(SymbolLocator.hitAt("nope", 2)).toBeNull();
  });
});
