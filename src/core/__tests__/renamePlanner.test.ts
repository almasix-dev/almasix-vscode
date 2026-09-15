import { describe, expect, it } from "vitest";
import { CallSiteSearcher } from "../callSiteSearcher";
import { RenamePlanner } from "../renamePlanner";
import { SymbolKind } from "../types";

describe("RenamePlanner", () => {
  it("rewrites route call sites", () => {
    const text = `
return redirect().route("home")
if route_is("home"):
    pass
other = route("dashboard")
`.trim();
    const occ = CallSiteSearcher.findInText(text, SymbolKind.ROUTE, "home");
    const plan = RenamePlanner.planFromOccurrences(
      SymbolKind.ROUTE,
      "home",
      "welcome",
      occ,
    );
    expect(plan.isAllowed).toBe(true);
    expect(plan.edits).toHaveLength(2);
    const out = RenamePlanner.applyToText(text, plan.edits);
    expect(out).toContain(`route("welcome")`);
    expect(out).toContain(`route_is("welcome")`);
    expect(out).toContain(`route("dashboard")`);
    expect(out).not.toContain(`route("home")`);
  });

  it("plans config key leaf rewrite", () => {
    const config = `
config = {
    "name": "x",
    "env": env("APP_ENV", "local"),
}
`.trim();
    const defs = RenamePlanner.planConfigKeyDefinition(
      config,
      "/app/config/app.py",
      "app.env",
      "app.environment",
      2,
    );
    expect(defs).toHaveLength(1);
    const rewritten = RenamePlanner.applyToText(config, defs);
    expect(rewritten).toContain('"environment":');
    expect(rewritten).not.toContain('"env":');
  });

  it("plans view file move", () => {
    const move = RenamePlanner.planViewFileMove(
      SymbolKind.VIEW,
      "auth.login",
      "auth.signin",
      "/app/resources/views/auth/login.prism.html",
      "/app",
    );
    expect(move).not.toBeNull();
    expect(move!.toPath.replace(/\\/g, "/")).toMatch(/auth\/signin\.prism\.html$/);
  });

  it("validates env names", () => {
    expect(RenamePlanner.validateNewName(SymbolKind.ROUTE, "teams.show")).toBeNull();
    expect(RenamePlanner.validateNewName(SymbolKind.ROUTE, "")).toBe("Name cannot be empty");
    expect(RenamePlanner.validateNewName(SymbolKind.ENV, "app_key")).not.toBeNull();
    expect(RenamePlanner.validateNewName(SymbolKind.ENV, "APP_SECRET")).toBeNull();
    expect(RenamePlanner.validateNewName(SymbolKind.COLUMN, "id")).not.toBeNull();
  });

  it("refuses empty occurrence lists", () => {
    const empty = RenamePlanner.planFromOccurrences(
      SymbolKind.ROUTE,
      "home",
      "welcome",
      [],
    );
    expect(empty.isAllowed).toBe(false);
    expect(empty.refusal).toBe("No usages found");
  });
});
