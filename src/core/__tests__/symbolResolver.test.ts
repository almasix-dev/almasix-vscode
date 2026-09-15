import { describe, expect, it } from "vitest";
import { SymbolResolver } from "../symbolResolver";
import { AlmasixIndex, SymbolKind } from "../types";

function sampleIndex(): AlmasixIndex {
  return new AlmasixIndex({
    basePath: "/tmp/app",
    ok: true,
    views: {
      welcome: "/tmp/app/resources/views/welcome.prism.html",
    },
    routes: {
      home: { uri: "/", methods: ["GET"], path: "/tmp/app/routes/web.py", line: 12 },
    },
    configKeys: ["app.name", "app.env"],
    configFiles: { app: "/tmp/app/config/app.py" },
    configLocations: {
      "app.env": { path: "/tmp/app/config/app.py", line: 17 },
    },
    envKeys: {
      APP_KEY: {
        path: null,
        line: 0,
        kind: "config",
        usedBy: ["config/app.py:22"],
      },
      APP_URL: { path: "/tmp/app/.env", line: 4, kind: "env" },
    },
    tables: {
      users: {
        path: "/tmp/mig.py",
        line: 1,
        columns: {
          id: { path: "/tmp/mig.py", line: 2 },
          email: { path: "/tmp/mig.py", line: 3 },
        },
      },
    },
    gates: ["update"],
    components: { alert: "/tmp/alert.prism.html" },
  });
}

describe("SymbolResolver", () => {
  it("resolves route, view, config, and env", () => {
    const index = sampleIndex();
    expect(SymbolResolver.resolve(index, SymbolKind.ROUTE, "home")).toEqual({
      path: "/tmp/app/routes/web.py",
      line: 12,
    });
    expect(SymbolResolver.resolve(index, SymbolKind.VIEW, "welcome")).toEqual({
      path: "/tmp/app/resources/views/welcome.prism.html",
      line: 0,
    });
    expect(SymbolResolver.resolve(index, SymbolKind.CONFIG, "app.env")).toEqual({
      path: "/tmp/app/config/app.py",
      line: 17,
    });
    expect(SymbolResolver.resolve(index, SymbolKind.ENV, "APP_URL")).toEqual({
      path: "/tmp/app/.env",
      line: 4,
    });
    expect(SymbolResolver.resolve(index, SymbolKind.ENV, "APP_KEY")).toEqual({
      path: "/tmp/app/config/app.py",
      line: 21,
    });
  });

  it("resolves columns and returns null for GATE", () => {
    const index = sampleIndex();
    expect(SymbolResolver.resolve(index, SymbolKind.COLUMN, "email", "users")).toEqual({
      path: "/tmp/mig.py",
      line: 3,
    });
    expect(SymbolResolver.resolveColumn(index, "user", "email")).toEqual({
      path: "/tmp/mig.py",
      line: 3,
    });
    expect(SymbolResolver.resolve(index, SymbolKind.GATE, "update")).toBeNull();
    expect(SymbolResolver.resolve(index, SymbolKind.ROUTE, "")).toBeNull();
    expect(SymbolResolver.resolve(index, SymbolKind.ENV_VALUE, "x")).toBeNull();
  });
});
