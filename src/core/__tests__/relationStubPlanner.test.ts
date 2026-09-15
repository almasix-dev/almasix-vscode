import { describe, expect, it } from "vitest";
import { RelationStubPlanner } from "../relationStubPlanner";

describe("RelationStubPlanner", () => {
  it("inserts a has_many stub into a model class", () => {
    const src = `
class Author(Model):
    fillable = ["name"]

    def team(self):
        return self.belongs_to(Team)
`.trim();
    const plan = RelationStubPlanner.planInsert(src, "posts", "Post");
    expect(plan.isAllowed).toBe(true);
    const out = RelationStubPlanner.applyToText(src, plan.edits);
    expect(out).toContain("def posts(self):");
    expect(out).toContain("has_many(Post)");
    expect(RelationStubPlanner.planInsert(src, "team", "Team").isAllowed).toBe(false);
    expect(RelationStubPlanner.planInsert(src, "", "X").isAllowed).toBe(false);
  });
});
