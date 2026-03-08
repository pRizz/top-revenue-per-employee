import fs from "node:fs/promises";
import path from "node:path";

import type {
  CompanyRecord,
  MetricRecord,
  MonetaryAmount,
  SourceAttribution,
} from "../../src/types/company-data";
import type { NormalizedDataset } from "./types";

const PROCESSED_DATASET_PATH = path.resolve(
  "data",
  "processed",
  "companies-timeseries.json",
);

type SourceName = keyof MetricRecord["sources"];

function sourceMetadataMatches(
  previousSource: SourceAttribution,
  nextSource: SourceAttribution,
): boolean {
  return (
    previousSource.provider === nextSource.provider &&
    previousSource.url === nextSource.url &&
    previousSource.note === nextSource.note
  );
}

function monetaryAmountMatches(
  previousAmount: MonetaryAmount | null,
  nextAmount: MonetaryAmount | null,
): boolean {
  if (previousAmount === nextAmount) {
    return true;
  }

  if (!previousAmount || !nextAmount) {
    return false;
  }

  return JSON.stringify(previousAmount) === JSON.stringify(nextAmount);
}

function sourceValueMatches(
  previousMetric: MetricRecord,
  nextMetric: MetricRecord,
  sourceName: SourceName,
): boolean {
  if (sourceName === "marketCap") {
    return monetaryAmountMatches(previousMetric.marketCap, nextMetric.marketCap);
  }

  if (sourceName === "revenue") {
    return monetaryAmountMatches(previousMetric.revenue, nextMetric.revenue);
  }

  return previousMetric.employeeCount === nextMetric.employeeCount;
}

function shouldPreserveFetchedAt(
  previousMetric: MetricRecord,
  nextMetric: MetricRecord,
  sourceName: SourceName,
): boolean {
  const previousSource = previousMetric.sources[sourceName];
  const nextSource = nextMetric.sources[sourceName];

  if (!previousSource || !nextSource) {
    return false;
  }

  return (
    sourceValueMatches(previousMetric, nextMetric, sourceName) &&
    sourceMetadataMatches(previousSource, nextSource)
  );
}

export function reconcileMetricSourceTimestamps(
  nextMetric: MetricRecord,
  maybePreviousMetric: MetricRecord | undefined,
): MetricRecord {
  if (!maybePreviousMetric) {
    return nextMetric;
  }

  const nextSources = { ...nextMetric.sources };

  for (const sourceName of Object.keys(nextMetric.sources) as SourceName[]) {
    if (!shouldPreserveFetchedAt(maybePreviousMetric, nextMetric, sourceName)) {
      continue;
    }

    const nextSource = nextSources[sourceName];
    const previousSource = maybePreviousMetric.sources[sourceName];
    if (!nextSource || !previousSource) {
      continue;
    }

    nextSources[sourceName] = {
      ...nextSource,
      fetchedAt: previousSource.fetchedAt,
    };
  }

  return {
    ...nextMetric,
    sources: nextSources,
  };
}

function reconcileCompanySourceTimestamps(
  nextCompany: CompanyRecord,
  maybePreviousCompany: CompanyRecord | undefined,
): CompanyRecord {
  if (!maybePreviousCompany) {
    return nextCompany;
  }

  const previousMetricByBucketId = new Map(
    maybePreviousCompany.metrics.map((metric) => [metric.bucketId, metric]),
  );

  return {
    ...nextCompany,
    metrics: nextCompany.metrics.map((metric) =>
      reconcileMetricSourceTimestamps(
        metric,
        previousMetricByBucketId.get(metric.bucketId),
      ),
    ),
  };
}

export function reconcileDatasetSourceTimestamps(
  nextDataset: NormalizedDataset,
  maybePreviousDataset: NormalizedDataset | null,
): NormalizedDataset {
  if (!maybePreviousDataset) {
    return nextDataset;
  }

  const previousCompanyBySymbol = new Map(
    maybePreviousDataset.companies.map((company) => [company.symbol, company]),
  );

  return {
    ...nextDataset,
    companies: nextDataset.companies.map((company) =>
      reconcileCompanySourceTimestamps(
        company,
        previousCompanyBySymbol.get(company.symbol),
      ),
    ),
  };
}

function comparableDataset(
  dataset: NormalizedDataset,
): Omit<NormalizedDataset, "generatedAt"> {
  const { generatedAt: _generatedAt, ...comparable } = dataset;
  return comparable;
}

export function hasMaterialDatasetChanges(
  nextDataset: NormalizedDataset,
  maybePreviousDataset: NormalizedDataset | null,
): boolean {
  if (!maybePreviousDataset) {
    return true;
  }

  return (
    JSON.stringify(comparableDataset(nextDataset)) !==
    JSON.stringify(comparableDataset(maybePreviousDataset))
  );
}

export async function readPreviousProcessedDataset(): Promise<NormalizedDataset | null> {
  try {
    const text = await fs.readFile(PROCESSED_DATASET_PATH, "utf8");
    return JSON.parse(text) as NormalizedDataset;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }

    throw error;
  }
}
