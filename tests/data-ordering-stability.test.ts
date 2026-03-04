import { describe, expect, it } from "vitest";

import { mapWithConcurrency, sortBySymbol } from "../scripts/data/order-utils";

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

describe("mapWithConcurrency", () => {
  it("preserves input ordering despite varied completion timing", async () => {
    const inputs = [
      { symbol: "ZZZ", delayMs: 30 },
      { symbol: "AAA", delayMs: 2 },
      { symbol: "DDD", delayMs: 20 },
      { symbol: "BBB", delayMs: 1 },
    ];

    const outputs = await mapWithConcurrency(
      inputs,
      4,
      async (input) => {
        await sleep(input.delayMs);
        return input.symbol;
      },
    );

    expect(outputs).toEqual(["ZZZ", "AAA", "DDD", "BBB"]);
  });
});

describe("sortBySymbol", () => {
  it("returns a symbol-sorted copy without mutating input", () => {
    const input = [
      { symbol: "MSFT", value: 2 },
      { symbol: "AAPL", value: 1 },
      { symbol: "NVDA", value: 3 },
    ];

    const sorted = sortBySymbol(input);

    expect(sorted.map((entry) => entry.symbol)).toEqual(["AAPL", "MSFT", "NVDA"]);
    expect(input.map((entry) => entry.symbol)).toEqual(["MSFT", "AAPL", "NVDA"]);
  });
});
