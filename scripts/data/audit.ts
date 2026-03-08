import type { CompaniesDataset, MetricRecord } from "@/types/company-data";

interface CurrencyAuditFieldSummary {
  currencyCounts: Record<string, number>;
  convertedMetricCount: number;
  unavailableMetricCount: number;
  convertedCompanies: string[];
  unavailableCompanies: string[];
}

export interface DatasetCurrencyAuditSummary {
  marketCap: CurrencyAuditFieldSummary;
  revenue: CurrencyAuditFieldSummary;
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

function summarizeField(
  companies: CompaniesDataset["companies"],
  fieldName: "marketCap" | "revenue",
): CurrencyAuditFieldSummary {
  const currencyCounts: Record<string, number> = {};
  const convertedCompanies: string[] = [];
  const unavailableCompanies: string[] = [];
  let convertedMetricCount = 0;
  let unavailableMetricCount = 0;

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
    convertedCompanies: [...convertedCompanies].sort((left, right) =>
      left.localeCompare(right),
    ),
    unavailableCompanies: [...unavailableCompanies].sort((left, right) =>
      left.localeCompare(right),
    ),
  };
}

function hasFlag(metric: MetricRecord, flag: string): boolean {
  return metric.flags.includes(flag);
}

export function buildDatasetCurrencyAuditSummary(
  dataset: CompaniesDataset,
): DatasetCurrencyAuditSummary {
  const annualCrossSourceAlignedCompanies: string[] = [];
  const annualCrossSourceMismatchCompanies: string[] = [];

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
    annualCrossSourceAlignedCompanies: annualCrossSourceAlignedCompanies.sort(
      (left, right) => left.localeCompare(right),
    ),
    annualCrossSourceMismatchCompanies: annualCrossSourceMismatchCompanies.sort(
      (left, right) => left.localeCompare(right),
    ),
  };
}
