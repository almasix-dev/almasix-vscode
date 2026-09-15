import { describe, expect, it } from "vitest";
import { MakeCatalog } from "../makeCatalog";

describe("MakeCatalog", () => {
  it("modelSmithArgs matches scaffolder flags", () => {
    expect(MakeCatalog.modelSmithArgs("Post", {})).toBe("make:model Post");
    expect(MakeCatalog.modelSmithArgs("Post", { all: true })).toBe("make:model Post -a");
    expect(
      MakeCatalog.modelSmithArgs("Post", {
        migration: true,
        factory: true,
        seed: true,
      }),
    ).toBe("make:model Post -m -f -s");
    expect(
      MakeCatalog.modelSmithArgs("Post", {
        resource: true,
        api: true,
        policy: true,
        requests: true,
      }),
    ).toBe("make:model Post -r --api --policy -R");
    expect(MakeCatalog.byId("model")!.interactive).toBe(true);
  });
});
