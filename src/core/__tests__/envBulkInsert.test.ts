import { describe, expect, it } from "vitest";
import { EnvBulkInsert } from "../envBulkInsert";

describe("EnvBulkInsert", () => {
  it("offers MAIL_* bulk insert", () => {
    const keys = ["MAIL_HOST", "MAIL_PORT", "MAIL_USERNAME", "APP_KEY"];
    const offer = EnvBulkInsert.offer(keys, "MAIL")!;
    expect(offer.keys).toHaveLength(3);
    expect(offer.presentableText).toContain("MAIL_*");
    expect(offer.presentableText).toContain("3 keys");
    const body = EnvBulkInsert.dotenvInsertion(offer.keys);
    expect(body).toContain("MAIL_HOST=");
    expect(body).toContain("MAIL_PORT=");
    expect(EnvBulkInsert.offer(keys, "APP_KEY")).toBeNull();
    expect(EnvBulkInsert.offer(keys, "")).toBeNull();
  });
});
