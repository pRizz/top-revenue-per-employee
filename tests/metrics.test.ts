import { describe, expect, it } from "vitest";

import { computeRevenuePerEmployee, median } from "@/lib/metrics";
import { sortBucketIds } from "@/lib/time-buckets";

describe("computeRevenuePerEmployee", () => {
  it("returns null for missing inputs", () => {
    expect(computeRevenuePerEmployee(null, 10)).toBeNull();
    expect(computeRevenuePerEmployee(1000, null)).toBeNull();
    expect(computeRevenuePerEmployee(1000, 0)).toBeNull();
  });

  it("computes ratio for valid values", () => {
    expect(computeRevenuePerEmployee(1_000_000, 100)).toBe(10_000);
  });
});

describe("median", () => {
  it("returns median for odd and even lengths", () => {
    expect(median([3, 2, 1])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("sortBucketIds", () => {
  it("sorts annual and quarterly buckets descending", () => {
    const sorted = sortBucketIds(["2024Q2", "2025", "2024", "2025Q1", "2025Q4"]);
    expect(sorted).toEqual(["2025", "2025Q4", "2025Q1", "2024", "2024Q2"]);
  });
});
