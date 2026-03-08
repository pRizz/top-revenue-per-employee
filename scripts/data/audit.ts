import type { CompaniesDataset, MetricRecord } from "@/types/company-data";

interface CurrencyAuditFieldSummary {
  currencyCounts: Record<string, number>;
  convertedMetricCount: number;
  unavailableMetricCount: number;
  partialFxCoverageMetricCount: number;
  convertedCompanies: string[];
  unavailableCompanies: string[];
  partialFxCoverageCompanies: string[];
}

interface RevenueSourceCountSummary {
  annual: Record<string, number>;
  quarterly: Record<string, number>;
  ttm: Record<string, number>;
}

interface AnnualQuarterSumMismatchSummary {
  symbol: string;
  bucketId: string;
  annualRevenueUsd: number;
  quarterRevenueUsdSum: number;
  ratio: number;
}

interface SequentialRevenueOutlierSummary {
  symbol: string;
  fromBucketId: string;
  toBucketId: string;
  reportedCurrency: string;
  ratio: number;
}

interface FallbackHeavyCompanySummary {
  symbol: string;
  marketCapSnapshotFallbackCount: number;
  employeeSnapshotFallbackCount: number;
  revenueConversionUnavailableCount: number;
}

export interface DatasetCurrencyAuditSummary {
  marketCap: CurrencyAuditFieldSummary;
  revenue: CurrencyAuditFieldSummary;
  revenueSourceCountsByBucketType: RevenueSourceCountSummary;
  latestAnnualCompaniesMarketCapCount: number;
  latestAnnualCompaniesMarketCapCompanies: string[];
  fiscalSpilloverCompanies: string[];
  annualQuarterSumMismatches: AnnualQuarterSumMismatchSummary[];
  sequentialRevenueOutliers: SequentialRevenueOutlierSummary[];
  fallbackHeavyCompanies: FallbackHeavyCompanySummary[];
  annualCrossSourceAlignedCompanies: string[];
  annualCrossSourceMismatchCompanies: string[];
}

function incrementCount(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function addUnique(values: string[], nextValue: string): void {
  if (!values.includes(nextValue)) {
    values.push(nextValue);
  }
}

function incrementSourceCount(
  summary: RevenueSourceCountSummary,
  bucketType: keyof RevenueSourceCountSummary,
  provider: string,
): void {
  summary[bucketType][provider] = (summary[bucketType][provider] ?? 0) + 1;
}

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

function periodEndQuarterId(periodEnd: string): string | null {
  const date = new Date(`${periodEnd}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }

  return `${date.getUTCFullYear()}Q${quarterFromMonth(date.getUTCMonth() + 1)}`;
}

function summarizeField(
  companies: CompaniesDataset["companies"],
  fieldName: "marketCap" | "revenue",
): CurrencyAuditFieldSummary {
  const currencyCounts: Record<string, number> = {};
  const convertedCompanies: string[] = [];
  const unavailableCompanies: string[] = [];
  const partialFxCoverageCompanies: string[] = [];
  let convertedMetricCount = 0;
  let unavailableMetricCount = 0;
  let partialFxCoverageMetricCount = 0;

  for (const company of companies) {
    for (const metric of company.metrics) {
      const maybeMoney = metric[fieldName];
      if (!maybeMoney) {
        continue;
      }

      incrementCount(currencyCounts, maybeMoney.reportedCurrency);

      if (maybeMoney.normalizationMethod === "fx_converted") {
        convertedMetricCount += 1;
        addUnique(convertedCompanies, company.symbol);
      }

      if (maybeMoney.normalizationMethod === "unavailable") {
        unavailableMetricCount += 1;
        addUnique(unavailableCompanies, company.symbol);
      }

      if (maybeMoney.fx?.coverageStatus === "partial") {
        partialFxCoverageMetricCount += 1;
        addUnique(partialFxCoverageCompanies, company.symbol);
      }
    }
  }

  return {
    currencyCounts: Object.fromEntries(
      Object.entries(currencyCounts).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    convertedMetricCount,
    unavailableMetricCount,
    partialFxCoverageMetricCount,
    convertedCompanies: [...convertedCompanies].sort((left, right) =>
      left.localeCompare(right),
    ),
    unavailableCompanies: [...unavailableCompanies].sort((left, right) =>
      left.localeCompare(right),
    ),
    partialFxCoverageCompanies: [...partialFxCoverageCompanies].sort(
      (left, right) => left.localeCompare(right),
    ),
  };
}

function hasFlag(metric: MetricRecord, flag: string): boolean {
  return metric.flags.includes(flag);
}

function createRevenueSourceCountSummary(): RevenueSourceCountSummary {
  return {
    annual: {},
    quarterly: {},
    ttm: {},
  };
}

function summarizeRevenueSources(
  companies: CompaniesDataset["companies"],
): RevenueSourceCountSummary {
  const sourceCountsByBucketType = createRevenueSourceCountSummary();

  for (const company of companies) {
    for (const metric of company.metrics) {
      const provider = metric.sources.revenue?.provider ?? "—";
      incrementSourceCount(
        sourceCountsByBucketType,
        metric.bucketType,
        provider,
      );
    }
  }

  return sourceCountsByBucketType;
}

function summarizeLatestAnnualCompaniesMarketCapUsage(
  companies: CompaniesDataset["companies"],
): {
  count: number;
  companies: string[];
} {
  const annualYears = companies
    .flatMap((company) =>
      company.metrics
        .filter((metric) => metric.bucketType === "annual")
        .map((metric) => Number(metric.bucketId)),
    )
    .filter((year) => Number.isInteger(year));
  const latestAnnualYear = Math.max(...annualYears, 0);
  const matchingCompanies: string[] = [];

  for (const company of companies) {
    const maybeMetric = company.metrics.find(
      (metric) =>
        metric.bucketType === "annual" &&
        metric.bucketId === String(latestAnnualYear) &&
        metric.sources.revenue?.provider === "CompaniesMarketCap",
    );
    if (maybeMetric) {
      matchingCompanies.push(company.symbol);
    }
  }

  return {
    count: matchingCompanies.length,
    companies: matchingCompanies.sort((left, right) => left.localeCompare(right)),
  };
}

function summarizeFiscalSpillovers(
  companies: CompaniesDataset["companies"],
): string[] {
  const spilloverCompanies: string[] = [];

  for (const company of companies) {
    for (const metric of company.metrics) {
      if (!metric.periodEnd) {
        continue;
      }

      if (metric.bucketType === "annual") {
        const periodEndYear = Number(metric.periodEnd.slice(0, 4));
        if (Number.isInteger(periodEndYear) && periodEndYear !== Number(metric.bucketId)) {
          addUnique(spilloverCompanies, company.symbol);
        }
      }

      if (metric.bucketType === "quarterly") {
        const maybeQuarterId = periodEndQuarterId(metric.periodEnd);
        if (maybeQuarterId && maybeQuarterId !== metric.bucketId) {
          addUnique(spilloverCompanies, company.symbol);
        }
      }
    }
  }

  return spilloverCompanies.sort((left, right) => left.localeCompare(right));
}

function summarizeAnnualQuarterSumMismatches(
  companies: CompaniesDataset["companies"],
): AnnualQuarterSumMismatchSummary[] {
  const mismatches: AnnualQuarterSumMismatchSummary[] = [];

  for (const company of companies) {
    for (const metric of company.metrics) {
      if (metric.bucketType !== "annual" || metric.revenueUsd === null) {
        continue;
      }

      const quarterMetrics = [1, 2, 3, 4]
        .map((quarter) =>
          company.metrics.find(
            (candidate) => candidate.bucketId === `${metric.bucketId}Q${quarter}`,
          ),
        )
        .filter((candidate): candidate is MetricRecord => candidate !== undefined);

      if (
        quarterMetrics.length !== 4 ||
        quarterMetrics.some((candidate) => candidate.revenueUsd === null)
      ) {
        continue;
      }

      const quarterRevenueUsdSum = quarterMetrics.reduce(
        (sum, candidate) => sum + (candidate.revenueUsd ?? 0),
        0,
      );
      const ratio = quarterRevenueUsdSum / metric.revenueUsd;

      if (Math.abs(1 - ratio) < 0.05) {
        continue;
      }

      mismatches.push({
        symbol: company.symbol,
        bucketId: metric.bucketId,
        annualRevenueUsd: metric.revenueUsd,
        quarterRevenueUsdSum,
        ratio,
      });
    }
  }

  return mismatches.sort(
    (left, right) => Math.abs(1 - right.ratio) - Math.abs(1 - left.ratio),
  );
}

function summarizeSequentialRevenueOutliers(
  companies: CompaniesDataset["companies"],
): SequentialRevenueOutlierSummary[] {
  const outliers: SequentialRevenueOutlierSummary[] = [];

  for (const company of companies) {
    const quarterlyMetrics = company.metrics
      .filter(
        (metric) =>
          metric.bucketType === "quarterly" &&
          metric.revenue !== null &&
          metric.revenue.reportedAmount > 0,
      )
      .sort((left, right) => left.bucketId.localeCompare(right.bucketId));

    for (let index = 1; index < quarterlyMetrics.length; index += 1) {
      const previousMetric = quarterlyMetrics[index - 1];
      const nextMetric = quarterlyMetrics[index];
      if (
        !previousMetric?.revenue ||
        !nextMetric?.revenue ||
        previousMetric.revenue.reportedCurrency !== nextMetric.revenue.reportedCurrency
      ) {
        continue;
      }

      const ratio =
        nextMetric.revenue.reportedAmount / previousMetric.revenue.reportedAmount;
      if (ratio >= 0.1 && ratio <= 10) {
        continue;
      }

      outliers.push({
        symbol: company.symbol,
        fromBucketId: previousMetric.bucketId,
        toBucketId: nextMetric.bucketId,
        reportedCurrency: nextMetric.revenue.reportedCurrency,
        ratio,
      });
    }
  }

  return outliers.sort(
    (left, right) => Math.abs(Math.log(right.ratio)) - Math.abs(Math.log(left.ratio)),
  );
}

function summarizeFallbackHeavyCompanies(
  companies: CompaniesDataset["companies"],
): FallbackHeavyCompanySummary[] {
  const summaries: FallbackHeavyCompanySummary[] = [];

  for (const company of companies) {
    const summary: FallbackHeavyCompanySummary = {
      symbol: company.symbol,
      marketCapSnapshotFallbackCount: company.metrics.filter((metric) =>
        metric.flags.includes("market_cap_snapshot_fallback"),
      ).length,
      employeeSnapshotFallbackCount: company.metrics.filter((metric) =>
        metric.flags.includes("employee_snapshot_fallback"),
      ).length,
      revenueConversionUnavailableCount: company.metrics.filter((metric) =>
        metric.flags.includes("revenue_currency_conversion_unavailable"),
      ).length,
    };

    if (
      summary.marketCapSnapshotFallbackCount === 0 &&
      summary.employeeSnapshotFallbackCount === 0 &&
      summary.revenueConversionUnavailableCount === 0
    ) {
      continue;
    }

    summaries.push(summary);
  }

  return summaries.sort((left, right) => {
    if (left.marketCapSnapshotFallbackCount !== right.marketCapSnapshotFallbackCount) {
      return right.marketCapSnapshotFallbackCount - left.marketCapSnapshotFallbackCount;
    }

    if (left.employeeSnapshotFallbackCount !== right.employeeSnapshotFallbackCount) {
      return right.employeeSnapshotFallbackCount - left.employeeSnapshotFallbackCount;
    }

    return left.symbol.localeCompare(right.symbol);
  });
}

export function buildDatasetCurrencyAuditSummary(
  dataset: CompaniesDataset,
): DatasetCurrencyAuditSummary {
  const annualCrossSourceAlignedCompanies: string[] = [];
  const annualCrossSourceMismatchCompanies: string[] = [];
  const latestAnnualCompaniesMarketCapUsage =
    summarizeLatestAnnualCompaniesMarketCapUsage(dataset.companies);

  for (const company of dataset.companies) {
    for (const metric of company.metrics) {
      if (metric.bucketType !== "annual") {
        continue;
      }

      if (hasFlag(metric, "annual_revenue_cross_source_aligned")) {
        addUnique(annualCrossSourceAlignedCompanies, company.symbol);
      }

      if (hasFlag(metric, "annual_revenue_cross_source_mismatch")) {
        addUnique(annualCrossSourceMismatchCompanies, company.symbol);
      }
    }
  }

  return {
    marketCap: summarizeField(dataset.companies, "marketCap"),
    revenue: summarizeField(dataset.companies, "revenue"),
    revenueSourceCountsByBucketType: summarizeRevenueSources(dataset.companies),
    latestAnnualCompaniesMarketCapCount: latestAnnualCompaniesMarketCapUsage.count,
    latestAnnualCompaniesMarketCapCompanies:
      latestAnnualCompaniesMarketCapUsage.companies,
    fiscalSpilloverCompanies: summarizeFiscalSpillovers(dataset.companies),
    annualQuarterSumMismatches: summarizeAnnualQuarterSumMismatches(
      dataset.companies,
    ),
    sequentialRevenueOutliers: summarizeSequentialRevenueOutliers(
      dataset.companies,
    ),
    fallbackHeavyCompanies: summarizeFallbackHeavyCompanies(dataset.companies),
    annualCrossSourceAlignedCompanies: annualCrossSourceAlignedCompanies.sort(
      (left, right) => left.localeCompare(right),
    ),
    annualCrossSourceMismatchCompanies: annualCrossSourceMismatchCompanies.sort(
      (left, right) => left.localeCompare(right),
    ),
  };
}
