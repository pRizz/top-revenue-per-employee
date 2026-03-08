import { DATA_CONFIG } from "./config";
import type {
  MetricAccumulator,
  NormalizedDataset,
  UniverseCompany,
} from "./types";
import type {
  CompanyRecord,
  MetricRecord,
  MonetaryAmount,
} from "@/types/company-data";

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
      marketCap: null,
      revenue: null,
      employeeCount: null,
      sources: {},
      flags: [],
    });
  }

  return map;
}

function normalizedUsdAmount(maybeMoney: MonetaryAmount | null): number | null {
  if (!maybeMoney) {
    return null;
  }

  return maybeMoney.usdAmount;
}

export function accumulatorMapToMetrics(map: Map<string, MetricAccumulator>): MetricRecord[] {
  return [...map.values()].map((entry) => {
    const revenuePerEmployeeUsd =
      normalizedUsdAmount(entry.revenue) !== null &&
      entry.employeeCount &&
      entry.employeeCount > 0
        ? (normalizedUsdAmount(entry.revenue) ?? 0) / entry.employeeCount
        : null;

    return {
      bucketId: entry.bucketId,
      bucketType: entry.bucketType,
      marketCap: entry.marketCap,
      revenue: entry.revenue,
      marketCapUsd: normalizedUsdAmount(entry.marketCap),
      revenueUsd: normalizedUsdAmount(entry.revenue),
      employeeCount: entry.employeeCount,
      revenuePerEmployeeUsd,
      sources: entry.sources,
      flags: entry.flags,
    };
  });
}

function toIsoDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function bucketDateRange(bucketId: string): {
  startDate: string;
  endDate: string;
} | null {
  if (!bucketId.includes("Q")) {
    const year = Number(bucketId);
    if (!Number.isInteger(year)) {
      return null;
    }

    return {
      startDate: toIsoDate(year, 1, 1),
      endDate: toIsoDate(year, 12, 31),
    };
  }

  const [yearText, quarterText] = bucketId.split("Q");
  const year = Number(yearText);
  const quarter = Number(quarterText);
  if (!Number.isInteger(year) || !Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
    return null;
  }

  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;

  return {
    startDate: toIsoDate(year, startMonth, 1),
    endDate: toIsoDate(year, endMonth, lastDayOfMonth(year, endMonth)),
  };
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
