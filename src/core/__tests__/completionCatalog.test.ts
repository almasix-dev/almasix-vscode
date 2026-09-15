import { describe, expect, it } from "vitest";
import { CallSiteDetector } from "../callSiteDetector";
import { CompletionCatalog } from "../completionCatalog";
import { AlmasixIndex, SymbolKind } from "../types";

describe("CompletionCatalog", () => {
  it("suggests route and column symbols", () => {
    const index = new AlmasixIndex({
      ok: true,
      routes: {
        home: { uri: "/", methods: ["GET"], path: "/r.py", line: 1 },
      },
      tables: {
        authors: {
          columns: { id: {}, email: {}, name: {} },
          model: "Author",
        },
      },
      modelMetadata: {
        Author: {
          fillable: ["email", "name"],
          module: "author",
          path: "/a.py",
        },
      },
    });

    const routeSite = CallSiteDetector.detect(`route("ho`)!;
    const routes = CompletionCatalog.symbolsFor(index, routeSite);
    expect(routes.some(([n]) => n === "home")).toBe(true);

    const chain = CallSiteDetector.detect(`Author.query().where("ema`)!;
    expect(chain.kind).toBe(SymbolKind.COLUMN);
    const cols = CompletionCatalog.symbolsFor(
      index,
      chain,
      `Author.query().where("ema`,
    );
    expect(cols.some(([n]) => n === "email")).toBe(true);
  });

  it("covers soft kinds without dumping columns without receiver", () => {
    const index = new AlmasixIndex({
      ok: true,
      gates: ["update"],
      casts: ["int"],
      components: { alert: "/a" },
      validationRules: ["required"],
      directives: ["if"],
      relations: { User: ["posts"] },
      tables: {
        users: { columns: { email: {} }, model: "User" },
      },
    });

    const soft = (kind: SymbolKind, recv?: string) =>
      CompletionCatalog.symbolsFor(index, { kind, prefix: "", receiver: recv });

    expect(soft(SymbolKind.GATE).some(([n]) => n === "update")).toBe(true);
    expect(soft(SymbolKind.CAST).some(([n]) => n === "int")).toBe(true);
    expect(soft(SymbolKind.COMPONENT).some(([n]) => n === "alert")).toBe(true);
    expect(soft(SymbolKind.VALIDATION).some(([n]) => n === "required")).toBe(true);
    expect(soft(SymbolKind.DIRECTIVE).some(([n]) => n === "if")).toBe(true);
    expect(soft(SymbolKind.RELATION, "User").some(([n]) => n === "posts")).toBe(true);
    expect(soft(SymbolKind.COLUMN)).toEqual([]);
    expect(soft(SymbolKind.COLUMN, "users").some(([n]) => n === "email")).toBe(true);
  });
});
