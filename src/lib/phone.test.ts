import { describe, expect, it } from "vitest";
import { normalizePhone, phoneLookupValues } from "./phone";

describe("phone normalization", () => {
  it("normalizes an Azerbaijani local number", () => expect(normalizePhone("050 123 45 67")).toBe("+994501234567"));
  it("keeps an international Azerbaijani number", () => expect(normalizePhone("+994 (50) 123-45-67")).toBe("+994501234567"));
  it("normalizes a country code without plus", () => expect(normalizePhone("994501234567")).toBe("+994501234567"));
  it("includes a legacy value when looking up an account", () => expect(phoneLookupValues("050 123 45 67")).toContain("0501234567"));
});
