import { describe, expect, it } from "vitest";
import { ToolWindowModel } from "../toolWindowModel";
import { AlmasixIndex } from "../types";

describe("ToolWindowModel", () => {
  const index = () =>
    new AlmasixIndex({
      ok: true,
      views: { welcome: "/v" },
      routes: { home: { uri: "/", methods: ["GET"] } },
      configKeys: ["app.env"],
      components: { alert: "/c" },
      envKeys: { APP_KEY: {} },
      tables: {
        users: { columns: { id: {} } },
      },
      gates: ["update"],
    });

  it("builds summary and status line", () => {
    const s = ToolWindowModel.summary(index());
    expect(s.ok).toBe(true);
    expect(s.views).toBe(1);
    expect(s.routes).toBe(1);
    expect(ToolWindowModel.statusLine(s).startsWith("OK —")).toBe(true);
    expect(
      ToolWindowModel.statusLine({
        ok: false,
        error: "boom",
        views: 0,
        routes: 0,
        configKeys: 0,
        components: 0,
        tables: 0,
        envKeys: 0,
        gates: 0,
        validationRules: 0,
      }),
    ).toContain("boom");
    expect(
      ToolWindowModel.statusLine({
        ok: false,
        error: null,
        views: 0,
        routes: 0,
        configKeys: 0,
        components: 0,
        tables: 0,
        envKeys: 0,
        gates: 0,
        validationRules: 0,
      }),
    ).toBe("Index not ready");
  });

  it("filters symbol rows", () => {
    const rows = ToolWindowModel.symbolRows(index(), "ho");
    expect(rows.some((r) => r.name === "home")).toBe(true);
    expect(rows.every((r) => r.name.toLowerCase().includes("ho"))).toBe(true);
    const all = ToolWindowModel.symbolRows(index());
    expect(all.length).toBeGreaterThanOrEqual(6);
    expect(all[0]!.kind <= all[all.length - 1]!.kind).toBe(true);
  });
});
