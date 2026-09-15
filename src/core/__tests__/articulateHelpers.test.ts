import { describe, expect, it } from "vitest";
import { ArticulateHelpers } from "../articulateHelpers";
import { AlmasixIndex } from "../types";

describe("ArticulateHelpers", () => {
  it("builds eager-load and where snippets", () => {
    const index = new AlmasixIndex({
      ok: true,
      relations: { User: ["posts", "profile"] },
      tables: {
        users: {
          columns: { email: {}, name: {} },
        },
      },
    });
    const eager = ArticulateHelpers.eagerLoadSnippets(index, "User");
    expect(eager.some((s) => s.template.includes('with_("posts")'))).toBe(true);
    expect(eager.some((s) => s.template.includes('load("profile")'))).toBe(true);
    // Unknown receiver falls back to all indexed relations (JetBrains parity).
    expect(ArticulateHelpers.eagerLoadSnippets(index, "Missing").length).toBeGreaterThan(0);
    expect(ArticulateHelpers.eagerLoadSnippets(new AlmasixIndex({ ok: true }), "User")).toEqual(
      [],
    );

    const where = ArticulateHelpers.whereColumnSnippets(index, "users");
    expect(where.some((s) => s.template.includes('where("email"'))).toBe(true);
  });

  it("builds has_many relation method stubs", () => {
    expect(ArticulateHelpers.relationMethodStub("posts", "Post")).toContain("has_many(Post)");
    expect(ArticulateHelpers.relationMethodStub("posts")).toBe(
      ArticulateHelpers.relationMethodStub("posts", "Related"),
    );
  });
});
