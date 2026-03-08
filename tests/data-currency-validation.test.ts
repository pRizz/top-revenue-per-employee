import { describe, expect, it } from "vitest";

import { validateDatasetSemantics } from "../scripts/data/validate";
import type { CompaniesDataset } from "../src/types/company-data";

function createDataset(overrides?: Partial<CompaniesDataset>): CompaniesDataset {
  return {
    generatedAt: "2026-03-08T00:00:00.000Z",
    topN: 1,
    bucketIds: ["2025"],
    buckets: [
      {
        id: "2025",
        bucketType: "annual",
        label: "2025",
      },
    ],
    companies: [
      {
        id: "TM-1",
        rank: 1,
        name: "Toyota",
        symbol: "TM",
        country: "Japan",
        marketCapUsd: 278_000_000_000,
        metrics: [
          {
            bucketId: "2025",
            bucketType: "annual",
            periodStart: "2024-04-01",
            periodEnd: "2025-03-31",
            displayLabel: "2025",
            marketCap: {
              reportedAmount: 278_000_000_000,
              reportedCurrency: "USD",
              usdAmount: 278_000_000_000,
              normalizationMethod: "reported_usd",
            },
            revenue: {
              reportedAmount: 48_036_704_000_000,
              reportedCurrency: "JPY",
              usdAmount: 330_239_433_537,
              normalizationMethod: "fx_converted",
              fx: {
                provider: "ECB EXR",
                quoteCurrency: "USD",
                rate: 0.006874,
                asOf: "2025-03-31",
                aggregation: "month_end_average",
                rangeStart: "2024-04-01",
                rangeEnd: "2025-03-31",
                sampleCount: 12,
                expectedSampleCount: 12,
                coverageStatus: "complete",
              },
            },
            marketCapUsd: 278_000_000_000,
            revenueUsd: 330_239_433_537,
            employeeCount: 383_853,
            revenuePerEmployeeUsd: 860_348.91,
            sources: {
              marketCap: {
                provider: "StockAnalysis",
                url: "https://stockanalysis.com/stocks/tm/market-cap/",
                fetchedAt: "2026-03-08T00:00:00.000Z",
              },
              revenue: {
                provider: "StockAnalysis",
                url: "https://stockanalysis.com/stocks/tm/revenue/",
                fetchedAt: "2026-03-08T00:00:00.000Z",
                note: "normalized from JPY",
              },
              employeeCount: {
                provider: "StockAnalysis",
                url: "https://stockanalysis.com/stocks/tm/employees/",
                fetchedAt: "2026-03-08T00:00:00.000Z",
              },
            },
            flags: ["revenue_fx_converted"],
          },
        ],
      },
    ],
    sources: [],
    ...overrides,
  };
}

describe("validateDatasetSemantics", () => {
  it("accepts fx-converted non-USD financial data", () => {
    expect(() => validateDatasetSemantics(createDataset())).not.toThrow();
  });

  it("rejects non-USD StockAnalysis data without conversion metadata or failure flags", () => {
    const dataset = createDataset();
    const metric = dataset.companies[0]!.metrics[0]!;
    metric.revenue = {
      reportedAmount: 48_036_704_000_000,
      reportedCurrency: "JPY",
      usdAmount: null,
      normalizationMethod: "unavailable",
    };
    metric.revenueUsd = null;
    metric.revenuePerEmployeeUsd = null;
    metric.flags = [];

    expect(() => validateDatasetSemantics(dataset)).toThrow(
      /non-USD StockAnalysis data without conversion or explicit failure flag/i,
    );
  });

  it("rejects latest-year CompaniesMarketCap revenue stored as annual", () => {
    const dataset = createDataset();
    const metric = dataset.companies[0]!.metrics[0]!;
    metric.revenue = {
      reportedAmount: 330_239_433_537,
      reportedCurrency: "USD",
      usdAmount: 330_239_433_537,
      normalizationMethod: "reported_usd",
    };
    metric.sources.revenue = {
      provider: "CompaniesMarketCap",
      url: "https://companiesmarketcap.com/toyota/revenue/",
      fetchedAt: "2026-03-08T00:00:00.000Z",
      note: "historical annual value",
    };
    metric.flags = [];

    expect(() => validateDatasetSemantics(dataset)).toThrow(
      /latest-year CompaniesMarketCap revenue must not be stored as annual/i,
    );
  });
});
