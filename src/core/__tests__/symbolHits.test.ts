import { describe, expect, it } from "vitest";
import { SymbolHits } from "../symbolHits";
import { SymbolKind } from "../types";

describe("SymbolHits.allHits", () => {
  it("finds quoted call sites and template vars", () => {
    const text = `
return route("home")
view("welcome")
Hello {{ title }} and {!! body !!}
`.trim();
    const hits = SymbolHits.allHits(text);
    expect(hits.some((h) => h.kind === SymbolKind.ROUTE && h.name === "home")).toBe(true);
    expect(hits.some((h) => h.kind === SymbolKind.VIEW && h.name === "welcome")).toBe(true);
    expect(hits.some((h) => h.kind === SymbolKind.TEMPLATE_VAR && h.name === "title")).toBe(
      true,
    );
    expect(hits.some((h) => h.kind === SymbolKind.TEMPLATE_VAR && h.name === "body")).toBe(true);
  });
});
