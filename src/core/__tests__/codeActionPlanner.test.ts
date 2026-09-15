import { describe, expect, it } from "vitest";
import { CodeActionPlanner } from "../codeActionPlanner";
import { AlmasixIndex, SymbolKind } from "../types";

describe("CodeActionPlanner", () => {
  it("suggests create view and smith make for unknown views", () => {
    const actions = CodeActionPlanner.forUnknownSymbol(
      new AlmasixIndex({ ok: true, basePath: "/tmp/app" }),
      SymbolKind.VIEW,
      "auth.login",
    );
    expect(actions).toHaveLength(2);
    expect(
      actions.some(
        (a) =>
          a.id === "create-view-file" &&
          a.createPath!.replace(/\\/g, "/").endsWith("auth/login.prism.html"),
      ),
    ).toBe(true);
    expect(actions.some((a) => a.smithArgs === "make:view auth.login")).toBe(true);
  });

  it("suggests create component for unknown components", () => {
    const actions = CodeActionPlanner.forUnknownSymbol(
      new AlmasixIndex({ ok: true, basePath: "/tmp/app" }),
      SymbolKind.COMPONENT,
      "alert",
    );
    expect(
      actions.some((a) => a.createPath?.replace(/\\/g, "/").includes("components/alert.prism.html")),
    ).toBe(true);
    expect(actions.some((a) => a.smithArgs?.startsWith("make:component"))).toBe(true);
  });

  it("returns empty when known or blank", () => {
    const idx = new AlmasixIndex({
      ok: true,
      views: { welcome: "/tmp/welcome.prism.html" },
    });
    expect(CodeActionPlanner.forUnknownSymbol(idx, SymbolKind.VIEW, "welcome")).toEqual([]);
    expect(CodeActionPlanner.forUnknownSymbol(idx, SymbolKind.VIEW, "")).toEqual([]);
    expect(CodeActionPlanner.forUnknownSymbol(idx, SymbolKind.ROUTE, "home")).toEqual([]);
  });
});
