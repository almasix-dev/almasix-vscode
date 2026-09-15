import { describe, expect, it } from "vitest";
import { CallSiteSearcher } from "../callSiteSearcher";
import { SymbolKind } from "../types";

describe("CallSiteSearcher.findInText", () => {
  it("finds route call sites", () => {
    const text = `
Route.get("/").name("home")
return redirect().route("home")
if route_is("home"):
    pass
other = route("dashboard")
`.trim();
    const hits = CallSiteSearcher.findInText(text, SymbolKind.ROUTE, "home");
    expect(hits).toHaveLength(2);
    expect(hits.every((h) => h.name === "home")).toBe(true);
  });

  it("finds view and include", () => {
    const text = `
return view("auth.login", {})
@include('auth.login')
@extends("layouts.app")
`.trim();
    expect(CallSiteSearcher.findInText(text, SymbolKind.VIEW, "auth.login")).toHaveLength(2);
    expect(CallSiteSearcher.findInText(text, SymbolKind.VIEW, "layouts.app")).toHaveLength(1);
  });

  it("finds config keys", () => {
    const text = `
env = config("app.env")
name = config('app.name')
other = config("app.debug")
`.trim();
    expect(CallSiteSearcher.findInText(text, SymbolKind.CONFIG, "app.env")).toHaveLength(1);
  });

  it("finds env keys in python and dotenv", () => {
    const py = `
key = env("APP_KEY")
url = env('APP_URL', 'http://localhost')
`.trim();
    expect(CallSiteSearcher.findInText(py, SymbolKind.ENV, "APP_KEY")).toHaveLength(1);

    const dotenv = `
APP_NAME=Progress
APP_KEY=base64:secret
TITLE=\${APP_KEY}
`.trim();
    const hits = CallSiteSearcher.findInText(dotenv, SymbolKind.ENV, "APP_KEY", true);
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });
});
