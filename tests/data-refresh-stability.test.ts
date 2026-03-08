import { describe, expect, it } from "vitest";

import {
  reconcileDatasetSourceTimestamps,
  reconcileMetricSourceTimestamps,
} from "../scripts/data/dataset-stability";
import type {
  CompanyRecord,
  MetricRecord,
  SourceAttribution,
} from "../src/types/company-data";
import type { NormalizedDataset } from "../scripts/data/types";

const OLD_FETCHED_AT = "2026-03-07T03:06:42.522Z";
const NEW_FETCHED_AT = "2026-03-07T20:15:17.105Z";

function createSource(
  overrides: Partial<SourceAttribution> = {},
): SourceAttribution {
  return {
    provider: "StockAnalysis",
    url: "https://stockanalysis.com/stocks/nvda/revenue/",
    fetchedAt: NEW_FETCHED_AT,
    ...overrides,
  };
}

function createMetric(
  overrides: Partial<MetricRecord> = {},
  sourceOverrides: Partial<MetricRecord["sources"]> = {},
): MetricRecord {
  const marketCap = {
    reportedAmount: 200,
    reportedCurrency: "USD",
    usdAmount: 200,
    normalizationMethod: "reported_usd" as const,
  };
  const revenue = {
    reportedAmount: 100,
    reportedCurrency: "USD",
    usdAmount: 100,
    normalizationMethod: "reported_usd" as const,
  };

  return {
    bucketId: "2025",
    bucketType: "annual",
    marketCap,
    revenue,
    marketCapUsd: 200,
    revenueUsd: 100,
    employeeCount: 10,
    revenuePerEmployeeUsd: 10,
    sources: {
      marketCap: createSource({
        url: "https://stockanalysis.com/stocks/nvda/market-cap/",
      }),
      revenue: createSource(),
      employeeCount: createSource({
        url: "https://stockanalysis.com/stocks/nvda/employees/",
      }),
      ...sourceOverrides,
    },
    flags: [],
    ...overrides,
  };
}

function createDataset(company: CompanyRecord): NormalizedDataset {
  return {
    generatedAt: NEW_FETCHED_AT,
    topN: 100,
    bucketIds: ["2025"],
    companies: [company],
  };
}

describe("reconcileMetricSourceTimestamps", () => {
  it("preserves fetchedAt values for unchanged sources", () => {
    const previousMetric = createMetric(
      {},
      {
        marketCap: createSource({
          url: "https://stockanalysis.com/stocks/nvda/market-cap/",
          fetchedAt: OLD_FETCHED_AT,
        }),
        revenue: createSource({
          fetchedAt: OLD_FETCHED_AT,
        }),
        employeeCount: createSource({
          url: "https://stockanalysis.com/stocks/nvda/employees/",
          fetchedAt: OLD_FETCHED_AT,
        }),
      },
    );
    const nextMetric = createMetric();

    const reconciledMetric = reconcileMetricSourceTimestamps(
      nextMetric,
      previousMetric,
    );

    expect(reconciledMetric.sources.marketCap?.fetchedAt).toBe(OLD_FETCHED_AT);
    expect(reconciledMetric.sources.revenue?.fetchedAt).toBe(OLD_FETCHED_AT);
    expect(reconciledMetric.sources.employeeCount?.fetchedAt).toBe(
      OLD_FETCHED_AT,
    );
  });

  it("keeps the new fetchedAt when the linked metric value changes", () => {
    const previousMetric = createMetric(
      {
        revenue: {
          reportedAmount: 100,
          reportedCurrency: "USD",
          usdAmount: 100,
          normalizationMethod: "reported_usd",
        },
        revenueUsd: 100,
        revenuePerEmployeeUsd: 10,
      },
      {
        revenue: createSource({
          fetchedAt: OLD_FETCHED_AT,
        }),
      },
    );
    const nextMetric = createMetric({
      revenue: {
        reportedAmount: 120,
        reportedCurrency: "USD",
        usdAmount: 120,
        normalizationMethod: "reported_usd",
      },
      revenueUsd: 120,
      revenuePerEmployeeUsd: 12,
    });

    const reconciledMetric = reconcileMetricSourceTimestamps(
      nextMetric,
      previousMetric,
    );

    expect(reconciledMetric.sources.revenue?.fetchedAt).toBe(NEW_FETCHED_AT);
  });

  it("keeps the new fetchedAt when source metadata changes", () => {
    const previousMetric = createMetric(
      {},
      {
        marketCap: createSource({
          url: "https://stockanalysis.com/stocks/nvda/market-cap/",
          fetchedAt: OLD_FETCHED_AT,
        }),
      },
    );
    const nextMetric = createMetric(
      {},
      {
        marketCap: createSource({
          provider: "CompaniesMarketCap",
          url: "https://companiesmarketcap.com/nvidia/marketcap/",
        }),
      },
    );

    const reconciledMetric = reconcileMetricSourceTimestamps(
      nextMetric,
      previousMetric,
    );

    expect(reconciledMetric.sources.marketCap?.fetchedAt).toBe(NEW_FETCHED_AT);
  });

  it("keeps the new fetchedAt when a source is newly added", () => {
    const previousMetric = createMetric({}, { employeeCount: undefined });
    const nextMetric = createMetric();

    const reconciledMetric = reconcileMetricSourceTimestamps(
      nextMetric,
      previousMetric,
    );

    expect(reconciledMetric.sources.employeeCount?.fetchedAt).toBe(
      NEW_FETCHED_AT,
    );
  });
});

describe("reconcileDatasetSourceTimestamps", () => {
  it("matches companies by symbol and metrics by bucketId", () => {
    const previousCompany: CompanyRecord = {
      id: "NVDA-3",
      rank: 3,
      name: "NVIDIA",
      symbol: "NVDA",
      country: "United States",
      marketCapUsd: 1_000,
      metrics: [
        createMetric(
          {
            bucketId: "2024",
          },
          {
            revenue: createSource({
              url: "https://stockanalysis.com/stocks/nvda/revenue/",
              fetchedAt: OLD_FETCHED_AT,
            }),
          },
        ),
      ],
    };
    const nextCompany: CompanyRecord = {
      ...previousCompany,
      id: "NVDA-1",
      rank: 1,
      metrics: [
        createMetric({
          bucketId: "2024",
        }),
      ],
    };

    const reconciledDataset = reconcileDatasetSourceTimestamps(
      createDataset(nextCompany),
      {
        ...createDataset(previousCompany),
        generatedAt: OLD_FETCHED_AT,
      },
    );

    expect(
      reconciledDataset.companies[0]?.metrics[0]?.sources.revenue?.fetchedAt,
    ).toBe(OLD_FETCHED_AT);
  });

  it("keeps the incoming generatedAt so refresh time stays current", () => {
    const company: CompanyRecord = {
      id: "NVDA-1",
      rank: 1,
      name: "NVIDIA",
      symbol: "NVDA",
      country: "United States",
      marketCapUsd: 1_000,
      metrics: [createMetric()],
    };
    const previousDataset = {
      ...createDataset(company),
      generatedAt: OLD_FETCHED_AT,
    };
    const nextDataset = createDataset(company);

    const reconciledDataset = reconcileDatasetSourceTimestamps(
      nextDataset,
      previousDataset,
    );

    expect(reconciledDataset.generatedAt).toBe(NEW_FETCHED_AT);
  });
});
