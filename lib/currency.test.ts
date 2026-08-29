import { describe, expect, it } from "vitest";
import { convertMinorUnits, toMajorUnits, toMinorUnits } from "@/lib/currency";

describe("currency minor-unit conversions", () => {
  it("uses zero minor-unit digits for UGX", () => {
    expect(toMinorUnits(37500, "UGX")).toBe(37500);
    expect(toMajorUnits(37500, "UGX")).toBe(37500);
  });

  it("uses two minor-unit digits for USD", () => {
    expect(toMinorUnits(37.5, "USD")).toBe(3750);
    expect(toMajorUnits(3750, "USD")).toBe(37.5);
  });

  it("converts between currencies using major-unit exchange rates", () => {
    expect(convertMinorUnits(10000, "USD", "UGX", 3800)).toBe(380000);
  });
});
