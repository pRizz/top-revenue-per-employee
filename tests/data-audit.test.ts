import { describe, expect, it } from "vitest";

import { buildDatasetCurrencyAuditSummary } from "../scripts/data/audit";
import type { CompaniesDataset } from "../src/types/company-data";

function createDataset(): CompaniesDataset {
  return {
    generatedAt: "2026-03-08T00:00:00.000Z",
    topN: 2,
    bucketIds: ["2025TTM", "2025", "2025Q1", "2025Q2", "2025Q3", "2025Q4"],
    buckets: [
      { id: "2025TTM", bucketType: "ttm", label: "2025 TTM" },
      { id: "2025", bucketType: "annual", label: "2025" },
      { id: "2025Q1", bucketType: "quarterly", label: "2025 Q1" },
      { id: "2025Q2", bucketType: "quarterly", label: "2025 Q2" },
      { id: "2025Q3", bucketType: "quarterly", label: "2025 Q3" },
      { id: "2025Q4", bucketType: "quarterly", label: "2025 Q4" },
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
            bucketId: "2025TTM",
            bucketType: "ttm",
            periodStart: "2024-11-01",
            periodEnd: "2025-10-31",
            displayLabel: "2025 TTM",
            marketCap: {
              reportedAmount: 278_000_000_000,
              reportedCurrency: "USD",
              usdAmount: 278_000_000_000,
              normalizationMethod: "reported_usd",
            },
            revenue: {
              reportedAmount: 332_000_000_000,
              reportedCurrency: "USD",
              usdAmount: 332_000_000_000,
              normalizationMethod: "reported_usd",
            },
            marketCapUsd: 278_000_000_000,
            revenueUsd: 332_000_000_000,
            employeeCount: 380_000,
            revenuePerEmployeeUsd: 873_684.21,
            sources: {
              revenue: {
                provider: "CompaniesMarketCap",
                url: "https://companiesmarketcap.com/toyota/revenue/",
                fetchedAt: "2026-03-08T00:00:00.000Z",
                note: "TTM value",
              },
            },
            flags: [],
          },
          {
            bucketId: "2025",
            bucketType: "annual",
            periodStart: "2025-02-01",
            periodEnd: "2026-01-31",
            displayLabel: "2025",
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
            sources: {
              revenue: {
                provider: "StockAnalysis",
                url: "https://stockanalysis.com/stocks/tm/revenue/",
                fetchedAt: "2026-03-08T00:00:00.000Z",
              },
            },
            flags: ["annual_revenue_cross_source_aligned"],
          },
          {
            bucketId: "2025Q1",
            bucketType: "quarterly",
            periodStart: "2025-02-01",
            periodEnd: "2025-04-30",
            displayLabel: "2025 Q1",
            marketCap: {
              reportedAmount: 278_000_000_000,
              reportedCurrency: "USD",
              usdAmount: 278_000_000_000,
              normalizationMethod: "reported_usd",
            },
            revenue: {
              reportedAmount: 12_000_000_000_000,
              reportedCurrency: "JPY",
              usdAmount: 90_000_000_000,
              normalizationMethod: "fx_converted",
              fx: {
                provider: "FawazAhmed Currency API",
                quoteCurrency: "USD",
                rate: 0.0075,
                asOf: "2025-04-30",
                aggregation: "month_end_average",
                rangeStart: "2025-02-01",
                rangeEnd: "2025-04-30",
                sampleCount: 2,
                expectedSampleCount: 3,
                coverageStatus: "partial",
              },
            },
            marketCapUsd: 278_000_000_000,
            revenueUsd: 90_000_000_000,
            employeeCount: 380_000,
            revenuePerEmployeeUsd: 236_842.1,
            sources: {
              revenue: {
                provider: "StockAnalysis",
                url: "https://stockanalysis.com/stocks/tm/revenue/",
                fetchedAt: "2026-03-08T00:00:00.000Z",
              },
            },
            flags: ["revenue_fx_converted"],
          },
          {
            bucketId: "2025Q2",
            bucketType: "quarterly",
            periodStart: "2025-05-01",
            periodEnd: "2025-07-31",
            displayLabel: "2025 Q2",
            marketCap: {
              reportedAmount: 278_000_000_000,
              reportedCurrency: "USD",
              usdAmount: 278_000_000_000,
              normalizationMethod: "reported_usd",
            },
            revenue: {
              reportedAmount: 12_000_000_000_000,
              reportedCurrency: "JPY",
              usdAmount: 90_000_000_000,
              normalizationMethod: "fx_converted",
              fx: {
                provider: "ECB EXR",
                quoteCurrency: "USD",
                rate: 0.0075,
                asOf: "2025-07-31",
                aggregation: "month_end_average",
                rangeStart: "2025-05-01",
                rangeEnd: "2025-07-31",
              },
            },
            marketCapUsd: 278_000_000_000,
            revenueUsd: 90_000_000_000,
            employeeCount: 380_000,
            revenuePerEmployeeUsd: 236_842.1,
            sources: {
              revenue: {
                provider: "StockAnalysis",
                url: "https://stockanalysis.com/stocks/tm/revenue/",
                fetchedAt: "2026-03-08T00:00:00.000Z",
              },
            },
            flags: ["revenue_fx_converted"],
          },
          {
            bucketId: "2025Q3",
            bucketType: "quarterly",
            periodStart: "2025-08-01",
            periodEnd: "2025-10-31",
            displayLabel: "2025 Q3",
            marketCap: {
              reportedAmount: 278_000_000_000,
              reportedCurrency: "USD",
              usdAmount: 278_000_000_000,
              normalizationMethod: "reported_usd",
            },
            revenue: {
              reportedAmount: 12_000_000_000_000,
              reportedCurrency: "JPY",
              usdAmount: 90_000_000_000,
              normalizationMethod: "fx_converted",
              fx: {
                provider: "ECB EXR",
                quoteCurrency: "USD",
                rate: 0.0075,
                asOf: "2025-10-31",
                aggregation: "month_end_average",
                rangeStart: "2025-08-01",
                rangeEnd: "2025-10-31",
              },
            },
            marketCapUsd: 278_000_000_000,
            revenueUsd: 90_000_000_000,
            employeeCount: 380_000,
            revenuePerEmployeeUsd: 236_842.1,
            sources: {
              revenue: {
                provider: "StockAnalysis",
                url: "https://stockanalysis.com/stocks/tm/revenue/",
                fetchedAt: "2026-03-08T00:00:00.000Z",
              },
            },
            flags: ["revenue_fx_converted"],
          },
          {
            bucketId: "2025Q4",
            bucketType: "quarterly",
            periodStart: "2025-11-01",
            periodEnd: "2026-01-31",
            displayLabel: "2025 Q4",
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
                rangeStart: "2025-11-01",
                rangeEnd: "2026-01-31",
              },
            },
            marketCapUsd: 278_000_000_000,
            revenueUsd: 86_400_000_000,
            employeeCount: 380_000,
            revenuePerEmployeeUsd: 227_368.42,
            sources: {
              revenue: {
                provider: "StockAnalysis",
                url: "https://stockanalysis.com/stocks/tm/revenue/",
                fetchedAt: "2026-03-08T00:00:00.000Z",
              },
            },
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
            periodStart: "2025-01-01",
            periodEnd: "2025-12-31",
            displayLabel: "2025",
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
                rangeStart: "2025-12-30",
                rangeEnd: "2025-12-30",
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
            sources: {
              revenue: {
                provider: "StockAnalysis",
                url: "https://stockanalysis.com/quote/krx/005930/revenue/",
                fetchedAt: "2026-03-08T00:00:00.000Z",
              },
            },
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
  it("summarizes currencies, periods, and fallback risk signals", () => {
    const summary = buildDatasetCurrencyAuditSummary(createDataset());

    expect(summary.marketCap.currencyCounts).toEqual({
      KRW: 1,
      USD: 6,
    });
    expect(summary.marketCap.convertedMetricCount).toBe(1);
    expect(summary.marketCap.convertedCompanies).toEqual(["005930.KS"]);

    expect(summary.revenue.currencyCounts).toEqual({
      JPY: 4,
      KRW: 1,
      USD: 2,
    });
    expect(summary.revenue.convertedMetricCount).toBe(4);
    expect(summary.revenue.unavailableMetricCount).toBe(1);
    expect(summary.revenue.partialFxCoverageMetricCount).toBe(1);
    expect(summary.revenue.convertedCompanies).toEqual(["TM"]);
    expect(summary.revenue.unavailableCompanies).toEqual(["005930.KS"]);
    expect(summary.revenue.partialFxCoverageCompanies).toEqual(["TM"]);

    expect(summary.revenueSourceCountsByBucketType.ttm).toEqual({
      CompaniesMarketCap: 1,
    });
    expect(summary.latestAnnualCompaniesMarketCapCount).toBe(0);
    expect(summary.fiscalSpilloverCompanies).toEqual(["TM"]);
    expect(summary.annualQuarterSumMismatches[0]).toMatchObject({
      symbol: "TM",
      bucketId: "2025",
    });
    expect(summary.annualCrossSourceAlignedCompanies).toEqual(["TM"]);
    expect(summary.annualCrossSourceMismatchCompanies).toEqual(["005930.KS"]);
  });
});
