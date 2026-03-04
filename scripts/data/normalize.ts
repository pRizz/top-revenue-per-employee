import { DATA_CONFIG } from "./config";
import type {
  MetricAccumulator,
  NormalizedDataset,
  UniverseCompany,
} from "./types";
import type { CompanyRecord, MetricRecord } from "@/types/company-data";

function quarterFromMonth(month: number): 1 | 2 | 3 | 4 {
  if (month <= 3) {
    return 1;
  }

  if (month <= 6) {
    return 2;
  }

  if (month <= 9) {
    return 3;
  }

  return 4;
}

export function bucketForDate(dateText: string): string | null {
  const date = new Date(dateText);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }

  const year = date.getUTCFullYear();
  const quarter = quarterFromMonth(date.getUTCMonth() + 1);
  return `${year}Q${quarter}`;
}

export function annualBucketForDate(dateText: string): string | null {
  const date = new Date(dateText);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }

  return String(date.getUTCFullYear());
}

export function buildSupportedBucketIds(): string[] {
  const bucketIds: string[] = [];
  for (const year of DATA_CONFIG.annualYears) {
    bucketIds.push(String(year));
  }

  for (const year of DATA_CONFIG.annualYears) {
    for (let quarter = 4; quarter >= 1; quarter -= 1) {
      bucketIds.push(`${year}Q${quarter}`);
    }
  }

  return bucketIds;
}

export function createEmptyAccumulatorMap(): Map<string, MetricAccumulator> {
  const map = new Map<string, MetricAccumulator>();
  for (const bucketId of buildSupportedBucketIds()) {
    map.set(bucketId, {
      bucketId,
      bucketType: bucketId.includes("Q") ? "quarterly" : "annual",
      marketCapUsd: null,
      revenueUsd: null,
      employeeCount: null,
      sources: {},
      flags: [],
    });
  }

  return map;
}

export function accumulatorMapToMetrics(map: Map<string, MetricAccumulator>): MetricRecord[] {
  return [...map.values()].map((entry) => {
    const revenuePerEmployeeUsd =
      entry.revenueUsd !== null && entry.employeeCount && entry.employeeCount > 0
        ? entry.revenueUsd / entry.employeeCount
        : null;

    return {
      bucketId: entry.bucketId,
      bucketType: entry.bucketType,
      marketCapUsd: entry.marketCapUsd,
      revenueUsd: entry.revenueUsd,
      employeeCount: entry.employeeCount,
      revenuePerEmployeeUsd,
      sources: entry.sources,
      flags: entry.flags,
    };
  });
}

export function toCompanyRecord(
  company: UniverseCompany,
  metrics: MetricRecord[],
): CompanyRecord {
  return {
    id: `${company.symbol}-${company.rank}`,
    rank: company.rank,
    name: company.name,
    symbol: company.symbol,
    country: company.country,
    marketCapUsd: company.marketCapUsd,
    metrics,
  };
}

export function createDataset(companies: CompanyRecord[]): NormalizedDataset {
  return {
    generatedAt: new Date().toISOString(),
    topN: DATA_CONFIG.topN,
    bucketIds: buildSupportedBucketIds(),
    companies,
  };
}
