import { describe, expect, it } from "vitest";
import { RefactorPlanner } from "../refactorPlanner";

describe("RefactorPlanner", () => {
  it("extracts a Prism partial", () => {
    const plan = RefactorPlanner.extractPartial(
      "/app",
      "<div>card</div>",
      10,
      25,
      "posts._card",
    );
    expect(plan.isAllowed).toBe(true);
    expect(plan.createPath!.replace(/\\/g, "/")).toMatch(/posts\/_card\.prism\.html$/);
    expect(plan.edits).toHaveLength(1);
    expect(plan.edits[0]!.newText).toBe("@include('posts._card')");
    const out = RefactorPlanner.applyToText("BEFORE<div>card</div>AFTER", [
      { startOffset: 6, endOffset: 21, newText: "@include('posts._card')" },
    ]);
    expect(out).toContain("@include");
  });

  it("converts @include to component", () => {
    const plan = RefactorPlanner.includeToComponent("@include('nav.bar')", 3);
    expect(plan.isAllowed).toBe(true);
    expect(plan.edits[0]!.newText).toBe("<x-nav.bar />");
    expect(RefactorPlanner.includeToComponent("@extends('x')", 0).refusal).not.toBeNull();
    expect(RefactorPlanner.includeToComponent("@include('')", 2).refusal).toBe("Missing name");
  });
});
