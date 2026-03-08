import { describe, expect, it } from "vitest";

import { __testing as fxTesting } from "../scripts/data/fx";

describe("FX helper utilities", () => {
  it("builds month-end sample dates within a range", () => {
    expect(
      fxTesting.monthEndDatesBetween("2024-01-01", "2024-03-31"),
    ).toEqual(["2024-01-31", "2024-02-29", "2024-03-31"]);
  });

  it("parses a currency-api USD snapshot", () => {
    const snapshot = fxTesting.parseCurrencyApiSnapshot({
      date: "2025-01-03",
      usd: {
        jpy: 157.32,
        twd: 32.77,
      },
    });

    expect(snapshot).toEqual({
      date: "2025-01-03",
      usd: {
        jpy: 157.32,
        twd: 32.77,
      },
    });
  });

  it("parses ECB jsondata observations and selects the latest value on or before a date", () => {
    const payload = {
      dataSets: [
        {
          series: {
            "0:0:0:0:0": {
              observations: {
                0: [161.1],
                1: [162.2],
                2: [163.3],
              },
            },
          },
        },
      ],
      structure: {
        dimensions: {
          observation: [
            {
              values: [
                { id: "2025-01-02" },
                { id: "2025-01-03" },
                { id: "2025-01-06" },
              ],
            },
          ],
        },
      },
    };

    const points = fxTesting.parseEcbSeriesPayload(payload);

    expect(points).toEqual([
      { date: "2025-01-02", value: 161.1 },
      { date: "2025-01-03", value: 162.2 },
      { date: "2025-01-06", value: 163.3 },
    ]);
    expect(fxTesting.seriesValueOnOrBefore(points, "2025-01-05")).toBe(162.2);
  });
});
