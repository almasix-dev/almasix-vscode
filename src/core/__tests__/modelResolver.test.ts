import { describe, expect, it } from "vitest";
import { ModelResolver } from "../modelResolver";
import { AlmasixIndex } from "../types";

describe("ModelResolver", () => {
  it("columnsFor returns empty for Blueprint table receiver", () => {
    const metaOnly = new AlmasixIndex({
      ok: true,
      modelMetadata: {
        Author: {
          fillable: ["bio"],
          guarded: ["secret"],
          hidden: ["token"],
          casts: { born_at: "date" },
          module: "author",
        },
      },
      tables: {
        users: { columns: { email: {} } },
      },
    });
    expect(ModelResolver.columnsFor(metaOnly, "table").size).toBe(0);
    expect(ModelResolver.columnsFor(new AlmasixIndex({ ok: true }), "Ghost").size).toBe(0);
  });
});
