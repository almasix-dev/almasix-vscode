import { describe, expect, it } from "vitest";
import { FileTemplates } from "../fileTemplates";

describe("FileTemplates", () => {
  it("model stub includes HasFactory", () => {
    const spec = FileTemplates.resolve("model", "Author")!;
    expect(spec.contents).toContain("HasFactory");
    expect(spec.contents).toContain("fillable: tuple[str, ...] = ()");
    expect(spec.contents).toContain("class Author(HasFactory, Model)");
    expect(spec.relativePath.replace(/\\/g, "/")).toBe("app/models/author.py");
  });
});
