import { describe, expect, it } from "vitest";
import { databaseErrorMessage } from "./prisma";

describe("database errors", () => {
  it("explains invalid Neon credentials", () => expect(databaseErrorMessage({ code: "P1000" })).toContain("credentials"));
  it("explains a missing Prisma table", () => expect(databaseErrorMessage({ code: "P2021" })).toContain("schema"));
  it("does not expose an unknown database error", () => expect(databaseErrorMessage(new Error("password=secret"))).not.toContain("secret"));
});
