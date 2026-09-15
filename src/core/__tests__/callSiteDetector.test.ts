import { describe, expect, it } from "vitest";
import { CallSiteDetector } from "../callSiteDetector";
import { CompletionCatalog } from "../completionCatalog";
import { ModelResolver } from "../modelResolver";
import { AlmasixIndex, SymbolKind } from "../types";

describe("CallSiteDetector", () => {
  it("detects route call", () => {
    const site = CallSiteDetector.detect(`route("hom`);
    expect(site).not.toBeNull();
    expect(site!.kind).toBe(SymbolKind.ROUTE);
    expect(site!.prefix).toBe("hom");
  });

  it("detects view call", () => {
    const site = CallSiteDetector.detect(`view('welcome`);
    expect(site!.kind).toBe(SymbolKind.VIEW);
    expect(site!.prefix).toBe("welcome");
  });

  it("detects config and env", () => {
    expect(CallSiteDetector.detect(`config("app.na`)!.kind).toBe(SymbolKind.CONFIG);
    expect(CallSiteDetector.detect(`env("APP_`)!.kind).toBe(SymbolKind.ENV);
  });

  it("detects dotenv bare key", () => {
    const site = CallSiteDetector.detect("QUEUE_CON", true);
    expect(site!.kind).toBe(SymbolKind.ENV);
    expect(site!.prefix).toBe("QUEUE_CON");
  });

  it("detects component x- tags", () => {
    const site = CallSiteDetector.detect(`<x-alert.`);
    expect(site!.kind).toBe(SymbolKind.COMPONENT);
    expect(site!.prefix).toBe("alert.");
  });

  it("detects validation rules", () => {
    const site = CallSiteDetector.detect(`validate({"email": "requ`);
    expect(site!.kind).toBe(SymbolKind.VALIDATION);
    expect(site!.prefix).toBe("requ");
  });

  it("detects casts key and value", () => {
    expect(CallSiteDetector.detect(`casts = {"ema`)!.kind).toBe(SymbolKind.MODEL_ATTR);
    expect(CallSiteDetector.detect(`casts = {"email": "dat`)!.kind).toBe(SymbolKind.CAST);
  });

  it("detects fillable list keys", () => {
    const modelSrc = `
class User(Model):
    fillable = ["ema
`.trim();
    expect(CallSiteDetector.detect(modelSrc)!.kind).toBe(SymbolKind.MODEL_ATTR);
  });

  it("detects Author.query().where chain", () => {
    const chain = CallSiteDetector.detect(`Author.query().where("ema`);
    expect(chain!.kind).toBe(SymbolKind.COLUMN);
    expect(chain!.receiver).toBe("Author");
    expect(chain!.prefix).toBe("ema");
  });

  it("detects Author.create(email= kwarg", () => {
    const kw = CallSiteDetector.detect(`Author.create(email=`);
    expect(kw!.kind).toBe(SymbolKind.COLUMN);
    expect(kw!.receiver).toBe("Author");
    expect(kw!.prefix).toBe("email");
  });

  it("detects DICT create column keys", () => {
    const site = CallSiteDetector.detect(`Author.create({"ema`);
    expect(site!.kind).toBe(SymbolKind.COLUMN);
    expect(site!.receiver).toBe("Author");
    expect(site!.prefix).toBe("ema");
  });

  it("detects chained redirect().route", () => {
    expect(CallSiteDetector.detect(`redirect().route("hom`)!.kind).toBe(SymbolKind.ROUTE);
  });

  it("detects @if directive prefix", () => {
    const site = CallSiteDetector.detect(`  @if`);
    expect(site!.kind).toBe(SymbolKind.DIRECTIVE);
    expect(site!.prefix).toBe("if");
  });

  it("does not dump columns for table. attr", () => {
    const tableAttr = CallSiteDetector.detect("table.ema");
    expect(tableAttr!.kind).toBe(SymbolKind.ATTR);
    const items = CompletionCatalog.symbolsFor(
      new AlmasixIndex({
        ok: true,
        tables: {
          users: { columns: { email: {} } },
        },
      }),
      tableAttr!,
    );
    expect(items).toEqual([]);
  });

  it("detects auth().user() attributes", () => {
    const auth = CallSiteDetector.detect("auth().user().ema");
    expect(auth!.kind).toBe(SymbolKind.ATTR);
    expect(auth!.receiver).toBe(ModelResolver.AUTH_USER_SENTINEL);
  });
});
