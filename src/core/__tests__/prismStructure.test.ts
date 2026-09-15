import { describe, expect, it } from "vitest";
import { PrismStructure } from "../prismStructure";

describe("PrismStructure", () => {
  it("reports unmatched @if", () => {
    expect(PrismStructure.analyze("@if(true)\nx\n@endif")).toEqual([]);
    const issues = PrismStructure.analyze("@if(true)\nx");
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain("Unclosed");
  });
});
