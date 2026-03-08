import { describe, expect, it } from "vitest";

import { buildDatasetCurrencyAuditSummary } from "../scripts/data/audit";
import type { CompaniesDataset } from "../src/types/company-data";

function createDataset(): CompaniesDataset {
  return {
    generatedAt: "2026-03-08T00:00:00.000Z",
    topN: 2,
    bucketIds: ["2025", "2025Q4"],
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
            marketCap: {
              reportedAmount: 278_000_000_000,
              reportedCurrency: "USD",
              usdAmount: 278_000_000_000,
              normalizationMethod: "reported_usd",
            },
            revenue: {
              reportedAmount: 330_000_000_000,
              reportedCurrency: "USD",
              usdAmount: 330_000_000_000,
              normalizationMethod: "reported_usd",
            },
            marketCapUsd: 278_000_000_000,
            revenueUsd: 330_000_000_000,
            employeeCount: 380_000,
            revenuePerEmployeeUsd: 868_421.05,
            sources: {},
            flags: ["annual_revenue_cross_source_aligned"],
          },
          {
            bucketId: "2025Q4",
            bucketType: "quarterly",
            marketCap: {
              reportedAmount: 278_000_000_000,
              reportedCurrency: "USD",
              usdAmount: 278_000_000_000,
              normalizationMethod: "reported_usd",
            },
            revenue: {
              reportedAmount: 13_456_851_000_000,
              reportedCurrency: "JPY",
              usdAmount: 86_400_000_000,
              normalizationMethod: "fx_converted",
              fx: {
                provider: "ECB EXR",
                quoteCurrency: "USD",
                rate: 0.00642,
                asOf: "2025-12-31",
                aggregation: "month_end_average",
              },
            },
            marketCapUsd: 278_000_000_000,
            revenueUsd: 86_400_000_000,
            employeeCount: 380_000,
            revenuePerEmployeeUsd: 227_368.42,
            sources: {},
            flags: ["revenue_fx_converted"],
          },
        ],
      },
      {
        id: "005930.KS-2",
        rank: 2,
        name: "Samsung",
        symbol: "005930.KS",
        country: "South Korea",
        marketCapUsd: 533_000_000_000,
        metrics: [
          {
            bucketId: "2025",
            bucketType: "annual",
            marketCap: {
              reportedAmount: 769_601_501_102_100,
              reportedCurrency: "KRW",
              usdAmount: 533_000_000_000,
              normalizationMethod: "fx_converted",
              fx: {
                provider: "ECB EXR",
                quoteCurrency: "USD",
                rate: 0.00069,
                asOf: "2025-12-30",
                aggregation: "point_in_time",
              },
            },
            revenue: {
              reportedAmount: 333_605_938_000_000,
              reportedCurrency: "KRW",
              usdAmount: null,
              normalizationMethod: "unavailable",
            },
            marketCapUsd: 533_000_000_000,
            revenueUsd: null,
            employeeCount: null,
            revenuePerEmployeeUsd: null,
            sources: {},
            flags: [
              "market_cap_fx_converted",
              "annual_revenue_cross_source_mismatch",
              "revenue_currency_conversion_unavailable",
            ],
          },
        ],
      },
    ],
    sources: [],
  };
}

describe("buildDatasetCurrencyAuditSummary", () => {
  it("summarizes currencies, conversions, and cross-source alignment flags", () => {
    const summary = buildDatasetCurrencyAuditSummary(createDataset());

    expect(summary.marketCap.currencyCounts).toEqual({
      KRW: 1,
      USD: 2,
    });
    expect(summary.marketCap.convertedMetricCount).toBe(1);
    expect(summary.marketCap.convertedCompanies).toEqual(["005930.KS"]);

    expect(summary.revenue.currencyCounts).toEqual({
      JPY: 1,
      KRW: 1,
      USD: 1,
    });
    expect(summary.revenue.convertedMetricCount).toBe(1);
    expect(summary.revenue.unavailableMetricCount).toBe(1);
    expect(summary.revenue.convertedCompanies).toEqual(["TM"]);
    expect(summary.revenue.unavailableCompanies).toEqual(["005930.KS"]);

    expect(summary.annualCrossSourceAlignedCompanies).toEqual(["TM"]);
    expect(summary.annualCrossSourceMismatchCompanies).toEqual(["005930.KS"]);
  });
});
