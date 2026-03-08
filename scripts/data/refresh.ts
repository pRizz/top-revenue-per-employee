import path from "node:path";

import { buildDatasetCurrencyAuditSummary } from "./audit";
import {
  prepareArchiveDirectories,
  writeProcessedSnapshot,
  writeStockAnalysisRawSnapshot,
  writeUniverseRawSnapshot,
} from "./archive";
import { buildPublicDataset, writePublicDataset } from "./build-public-dataset";
import { DATA_CONFIG } from "./config";
import { FxRateService } from "./fx";
import {
  accumulatorMapToMetrics,
  annualBucketForPeriodEndDate,
  bucketForQuarterEndDate,
  createDataset,
  createEmptyAccumulatorMap,
  toCompanyRecord,
} from "./normalize";
import {
  hasMaterialDatasetChanges,
  readPreviousProcessedDataset,
  reconcileDatasetSourceTimestamps,
} from "./dataset-stability";
import { mapWithConcurrency, sortBySymbol } from "./order-utils";
import {
  fetchRevenueSnapshotFromCompaniesMarketCap,
  fetchUniverseWithEmployeeSnapshot,
} from "./sources/companies-marketcap";
import {
  createStockAnalysisRouteResolver,
  fetchStockAnalysisSeries,
  type StockAnalysisRouteResolver,
} from "./sources/stockanalysis";
import type { UniverseCompany } from "./types";
import { validateDatasetSemantics } from "./validate";
import type { MonetaryAmount } from "@/types/company-data";

interface StockAnalysisSnapshot {
  symbol: string;
  resolvedBasePath: string | null;
  companiesMarketCapRevenue: {
    annualRevenueByYear: Record<string, number>;
    ttmRevenue: {
      year: number;
      amount: number;
      periodStart: string | null;
      periodEnd: string | null;
    } | null;
  } | null;
  currencies: {
    main: string | null;
    financial: string | null;
  };
  counts: {
    quarterlyRevenue: number;
    annualRevenue: number;
    quarterlyMarketCap: number;
    annualMarketCap: number;
    annualEmployees: number;
  };
  series: {
    quarterlyRevenue: Array<{
      date: string;
      revenue: number;
    }>;
    annualRevenue: Array<{
      date: string;
      revenue: number;
    }>;
    quarterlyMarketCap: Array<{
      date: string;
      value: number;
    }>;
    annualMarketCap: Array<{
      date: string;
      value: number;
    }>;
    annualEmployees: Array<{
      date: string;
      count: number;
    }>;
  };
}

interface CompanyProcessingResult {
  companyRecord: ReturnType<typeof toCompanyRecord>;
  stockAnalysisSnapshot: StockAnalysisSnapshot;
}

function addFlag(entry: { flags: string[] }, flag: string): void {
  if (!entry.flags.includes(flag)) {
    entry.flags.push(flag);
  }
}

function removeFlag(entry: { flags: string[] }, flag: string): void {
  entry.flags = entry.flags.filter((value) => value !== flag);
}

function createUsdMoney(
  amount: number,
  normalizationMethod: MonetaryAmount["normalizationMethod"],
): MonetaryAmount {
  return {
    reportedAmount: amount,
    reportedCurrency: "USD",
    usdAmount: amount,
    normalizationMethod,
  };
}

function relativeDifference(left: number, right: number): number {
  const denominator = Math.max(Math.abs(left), Math.abs(right), 1);
  return Math.abs(left - right) / denominator;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shiftIsoDate(dateText: string, days: number): string | null {
  const date = new Date(`${dateText}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }

  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

function derivePeriodRange(
  endDate: string,
  maybePreviousEndDate: string | undefined,
  fallbackLengthDays: number,
): {
  startDate: string | null;
  endDate: string;
} {
  const startDate =
    maybePreviousEndDate !== undefined
      ? shiftIsoDate(maybePreviousEndDate, 1)
      : shiftIsoDate(endDate, -(fallbackLengthDays - 1));

  return {
    startDate,
    endDate,
  };
}

function setPeriodMetadata(
  entry: ReturnType<typeof createEmptyAccumulatorMap> extends Map<string, infer Value>
    ? Value
    : never,
  periodRange: {
    startDate: string | null;
    endDate: string | null;
  },
): void {
  if (periodRange.startDate !== null) {
    entry.periodStart = periodRange.startDate;
  }

  if (periodRange.endDate !== null) {
    entry.periodEnd = periodRange.endDate;
  }
}

function fillFallbackMarketCap(
  map: ReturnType<typeof createEmptyAccumulatorMap>,
  company: UniverseCompany,
  fetchedAt: string,
): void {
  for (const entry of map.values()) {
    entry.marketCap = createUsdMoney(company.marketCapUsd, "snapshot_fallback");
    entry.sources.marketCap = {
      provider: "CompaniesMarketCap",
      url: "https://companiesmarketcap.com/?download=csv",
      fetchedAt,
      note: "current snapshot fallback",
    };
    addFlag(entry, "market_cap_snapshot_fallback");
  }
}

function fillFallbackEmployees(
  map: ReturnType<typeof createEmptyAccumulatorMap>,
  employeeCount: number | undefined,
  fetchedAt: string,
): void {
  if (!employeeCount) {
    return;
  }

  for (const entry of map.values()) {
    entry.employeeCount = employeeCount;
    entry.sources.employeeCount = {
      provider: "CompaniesMarketCap",
      url: "https://companiesmarketcap.com/largest-companies-by-number-of-employees/",
      fetchedAt,
      note: "current snapshot fallback",
    };
    addFlag(entry, "employee_snapshot_fallback");
  }
}

function recordUnavailableRevenue(
  entry: ReturnType<typeof createEmptyAccumulatorMap> extends Map<string, infer Value>
    ? Value
    : never,
  reportedAmount: number,
  reportedCurrency: string | null,
  periodRange?: {
    startDate: string | null;
    endDate: string | null;
  },
): void {
  entry.revenue = {
    reportedAmount,
    reportedCurrency: reportedCurrency ?? "UNKNOWN",
    usdAmount: null,
    normalizationMethod: "unavailable",
  };
  if (periodRange) {
    setPeriodMetadata(entry, periodRange);
  }
  addFlag(entry, "revenue_currency_conversion_unavailable");
}

function sortPointsAscending<T extends { date: string }>(points: T[]): T[] {
  return [...points].sort((left, right) => left.date.localeCompare(right.date));
}

function sortMarketCapPointsAscending<T extends { d: string }>(points: T[]): T[] {
  return [...points].sort((left, right) => left.d.localeCompare(right.d));
}

async function processCompany(
  company: UniverseCompany,
  employeeBySymbol: Map<string, number>,
  fetchedAt: string,
  routeResolver: StockAnalysisRouteResolver,
  fxRateService: FxRateService,
): Promise<CompanyProcessingResult> {
  const accumulatorMap = createEmptyAccumulatorMap();
  fillFallbackMarketCap(accumulatorMap, company, fetchedAt);
  fillFallbackEmployees(accumulatorMap, employeeBySymbol.get(company.symbol), fetchedAt);
  const stockAnalysisSnapshot: StockAnalysisSnapshot = {
    symbol: company.symbol,
    resolvedBasePath: null,
    companiesMarketCapRevenue: null,
    currencies: {
      main: null,
      financial: null,
    },
    counts: {
      quarterlyRevenue: 0,
      annualRevenue: 0,
      quarterlyMarketCap: 0,
      annualMarketCap: 0,
      annualEmployees: 0,
    },
    series: {
      quarterlyRevenue: [],
      annualRevenue: [],
      quarterlyMarketCap: [],
      annualMarketCap: [],
      annualEmployees: [],
    },
  };

  try {
    const revenueSnapshot = await fetchRevenueSnapshotFromCompaniesMarketCap(
      company.slug,
    );
    stockAnalysisSnapshot.companiesMarketCapRevenue = {
      annualRevenueByYear: Object.fromEntries(
        [...revenueSnapshot.annualRevenueByYear.entries()].sort(
          ([left], [right]) => left - right,
        ),
      ),
      ttmRevenue: revenueSnapshot.ttmRevenue,
    };

    for (const [year, revenue] of revenueSnapshot.annualRevenueByYear.entries()) {
      const bucketId = String(year);
      const maybeEntry = accumulatorMap.get(bucketId);
      if (!maybeEntry) {
        continue;
      }

      if (revenue <= 0) {
        continue;
      }

      maybeEntry.revenue = createUsdMoney(revenue, "reported_usd");
      setPeriodMetadata(maybeEntry, {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      });
      maybeEntry.sources.revenue = {
        provider: "CompaniesMarketCap",
        url: `https://companiesmarketcap.com/${company.slug}/revenue/`,
        fetchedAt,
        note: "historical annual value",
      };
    }

    if (revenueSnapshot.ttmRevenue !== null) {
      const ttmBucketId = `${revenueSnapshot.ttmRevenue.year}TTM`;
      const maybeEntry = accumulatorMap.get(ttmBucketId);
      if (maybeEntry) {
        maybeEntry.revenue = createUsdMoney(
          revenueSnapshot.ttmRevenue.amount,
          "reported_usd",
        );
        setPeriodMetadata(maybeEntry, {
          startDate: revenueSnapshot.ttmRevenue.periodStart,
          endDate: revenueSnapshot.ttmRevenue.periodEnd,
        });
        maybeEntry.sources.revenue = {
          provider: "CompaniesMarketCap",
          url: `https://companiesmarketcap.com/${company.slug}/revenue/`,
          fetchedAt,
          note: "TTM value",
        };
      }
    }
  } catch {
    // Keep fallback state when this source fails.
  }

  try {
    const stockAnalysis = await fetchStockAnalysisSeries(
      company.symbol,
      routeResolver,
    );
    stockAnalysisSnapshot.resolvedBasePath = stockAnalysis.resolvedBasePath;
    stockAnalysisSnapshot.currencies = stockAnalysis.currencies;
    stockAnalysisSnapshot.counts.quarterlyRevenue =
      stockAnalysis.quarterlyRevenue.length;
    stockAnalysisSnapshot.counts.annualRevenue = stockAnalysis.annualRevenue.length;
    stockAnalysisSnapshot.counts.quarterlyMarketCap =
      stockAnalysis.quarterlyMarketCap.length;
    stockAnalysisSnapshot.counts.annualMarketCap =
      stockAnalysis.annualMarketCap.length;
    stockAnalysisSnapshot.counts.annualEmployees =
      stockAnalysis.annualEmployees.length;
    stockAnalysisSnapshot.series = {
      quarterlyRevenue: stockAnalysis.quarterlyRevenue,
      annualRevenue: stockAnalysis.annualRevenue,
      quarterlyMarketCap: stockAnalysis.quarterlyMarketCap.map((point) => ({
        date: point.d,
        value: point.v,
      })),
      annualMarketCap: stockAnalysis.annualMarketCap.map((point) => ({
        date: point.d,
        value: point.v,
      })),
      annualEmployees: stockAnalysis.annualEmployees,
    };
    if (stockAnalysis.resolvedBasePath) {
      const baseUrl = `https://stockanalysis.com${stockAnalysis.resolvedBasePath}`;

      const quarterlyRevenuePoints = sortPointsAscending(
        stockAnalysis.quarterlyRevenue,
      );
      for (const [index, point] of quarterlyRevenuePoints.entries()) {
        const maybeBucketId = bucketForQuarterEndDate(point.date);
        if (!maybeBucketId) {
          continue;
        }

        const maybeEntry = accumulatorMap.get(maybeBucketId);
        if (!maybeEntry) {
          continue;
        }

        if (point.revenue <= 0) {
          continue;
        }

        const maybePreviousPoint = quarterlyRevenuePoints[index - 1];
        const periodRange = derivePeriodRange(
          point.date,
          maybePreviousPoint?.date,
          91,
        );

        const revenue = await fxRateService.toComparableMoney(
          point.revenue,
          stockAnalysis.currencies.financial ?? "UNKNOWN",
          "month_end_average",
          {
            rangeStart: periodRange.startDate ?? point.date,
            rangeEnd: periodRange.endDate,
          },
        );

        if (revenue.usdAmount === null) {
          recordUnavailableRevenue(
            maybeEntry,
            point.revenue,
            stockAnalysis.currencies.financial,
            periodRange,
          );
          continue;
        }

        maybeEntry.revenue = revenue;
        setPeriodMetadata(maybeEntry, periodRange);
        maybeEntry.sources.revenue = {
          provider: "StockAnalysis",
          url: `${baseUrl}/revenue/`,
          fetchedAt,
          note:
            revenue.reportedCurrency === "USD"
              ? undefined
              : `normalized from ${revenue.reportedCurrency}`,
        };
        if (revenue.normalizationMethod === "fx_converted") {
          addFlag(maybeEntry, "revenue_fx_converted");
        }
      }

      const annualRevenuePoints = sortPointsAscending(stockAnalysis.annualRevenue);
      for (const [index, point] of annualRevenuePoints.entries()) {
        const maybeBucketId = annualBucketForPeriodEndDate(point.date);
        if (!maybeBucketId) {
          continue;
        }

        const maybeEntry = accumulatorMap.get(maybeBucketId);
        if (!maybeEntry) {
          continue;
        }

        if (point.revenue <= 0) {
          continue;
        }

        const maybePreviousPoint = annualRevenuePoints[index - 1];
        const periodRange = derivePeriodRange(
          point.date,
          maybePreviousPoint?.date,
          365,
        );

        const revenue = await fxRateService.toComparableMoney(
          point.revenue,
          stockAnalysis.currencies.financial ?? "UNKNOWN",
          "month_end_average",
          {
            rangeStart: periodRange.startDate ?? point.date,
            rangeEnd: periodRange.endDate,
          },
        );

        const hasCompaniesMarketCapRevenue =
          maybeEntry.sources.revenue?.provider === "CompaniesMarketCap" &&
          maybeEntry.revenue?.usdAmount !== null;

        if (hasCompaniesMarketCapRevenue) {
          if (revenue.usdAmount === null) {
            addFlag(maybeEntry, "annual_revenue_stockanalysis_unavailable");
            continue;
          }

          const maybeCurrentUsdAmount = maybeEntry.revenue?.usdAmount;
          if (maybeCurrentUsdAmount === null || maybeCurrentUsdAmount === undefined) {
            continue;
          }

          if (
            relativeDifference(maybeCurrentUsdAmount, revenue.usdAmount) <=
            DATA_CONFIG.annualRevenueCrossSourceTolerance
          ) {
            addFlag(maybeEntry, "annual_revenue_cross_source_aligned");
          } else {
            addFlag(maybeEntry, "annual_revenue_cross_source_mismatch");
          }
        }

        if (revenue.usdAmount === null) {
          recordUnavailableRevenue(
            maybeEntry,
            point.revenue,
            stockAnalysis.currencies.financial,
            periodRange,
          );
          continue;
        }

        maybeEntry.revenue = revenue;
        setPeriodMetadata(maybeEntry, periodRange);
        maybeEntry.sources.revenue = {
          provider: "StockAnalysis",
          url: `${baseUrl}/revenue/`,
          fetchedAt,
          note:
            revenue.reportedCurrency === "USD"
              ? undefined
              : `normalized from ${revenue.reportedCurrency}`,
        };
        if (revenue.normalizationMethod === "fx_converted") {
          addFlag(maybeEntry, "revenue_fx_converted");
        }
      }

      for (const point of sortMarketCapPointsAscending(stockAnalysis.quarterlyMarketCap)) {
        const maybeBucketId = bucketForQuarterEndDate(point.d);
        if (!maybeBucketId) {
          continue;
        }

        const maybeEntry = accumulatorMap.get(maybeBucketId);
        if (!maybeEntry) {
          continue;
        }

        if (point.v <= 0) {
          continue;
        }

        const marketCap = await fxRateService.toComparableMoney(
          point.v,
          stockAnalysis.currencies.main ?? "UNKNOWN",
          "point_in_time",
          {
            date: point.d,
          },
        );

        if (marketCap.usdAmount === null) {
          addFlag(maybeEntry, "market_cap_currency_conversion_unavailable");
          continue;
        }

        maybeEntry.marketCap = marketCap;
        maybeEntry.sources.marketCap = {
          provider: "StockAnalysis",
          url: `${baseUrl}/market-cap/`,
          fetchedAt,
          note:
            marketCap.reportedCurrency === "USD"
              ? undefined
              : `normalized from ${marketCap.reportedCurrency}`,
        };
        removeFlag(maybeEntry, "market_cap_snapshot_fallback");
        if (marketCap.normalizationMethod === "fx_converted") {
          addFlag(maybeEntry, "market_cap_fx_converted");
        }
      }

      for (const point of sortMarketCapPointsAscending(stockAnalysis.annualMarketCap)) {
        const maybeBucketId = annualBucketForPeriodEndDate(point.d);
        if (!maybeBucketId) {
          continue;
        }

        const maybeEntry = accumulatorMap.get(maybeBucketId);
        if (!maybeEntry) {
          continue;
        }

        if (point.v <= 0) {
          continue;
        }

        const marketCap = await fxRateService.toComparableMoney(
          point.v,
          stockAnalysis.currencies.main ?? "UNKNOWN",
          "point_in_time",
          {
            date: point.d,
          },
        );

        if (marketCap.usdAmount === null) {
          addFlag(maybeEntry, "market_cap_currency_conversion_unavailable");
          continue;
        }

        maybeEntry.marketCap = marketCap;
        maybeEntry.sources.marketCap = {
          provider: "StockAnalysis",
          url: `${baseUrl}/market-cap/`,
          fetchedAt,
          note:
            marketCap.reportedCurrency === "USD"
              ? undefined
              : `normalized from ${marketCap.reportedCurrency}`,
        };
        removeFlag(maybeEntry, "market_cap_snapshot_fallback");
        if (marketCap.normalizationMethod === "fx_converted") {
          addFlag(maybeEntry, "market_cap_fx_converted");
        }
      }

      for (const point of sortPointsAscending(stockAnalysis.annualEmployees)) {
        const maybeBucketId = annualBucketForPeriodEndDate(point.date);
        if (!maybeBucketId) {
          continue;
        }

        const maybeEntry = accumulatorMap.get(maybeBucketId);
        if (!maybeEntry) {
          continue;
        }

        if (point.count <= 0) {
          continue;
        }

        maybeEntry.employeeCount = point.count;
        setPeriodMetadata(maybeEntry, {
          startDate: maybeEntry.periodStart,
          endDate: point.date,
        });
        maybeEntry.sources.employeeCount = {
          provider: "StockAnalysis",
          url: `${baseUrl}/employees/`,
          fetchedAt,
        };
        removeFlag(maybeEntry, "employee_snapshot_fallback");
      }
    }
  } catch {
    // Keep fallback values if enrichment fails.
  }

  const metrics = accumulatorMapToMetrics(accumulatorMap);
  return {
    companyRecord: toCompanyRecord(company, metrics),
    stockAnalysisSnapshot,
  };
}

async function main(): Promise<void> {
  const now = new Date();
  const fetchedAt = now.toISOString();
  const maybePreviousDataset = await readPreviousProcessedDataset();

  const universeBundle = await fetchUniverseWithEmployeeSnapshot();
  const stockAnalysisRouteResolver = await createStockAnalysisRouteResolver();
  const fxRateService = new FxRateService();

  const processingResults = await mapWithConcurrency(
    universeBundle.companies,
    8,
    async (company) =>
      await processCompany(
        company,
        universeBundle.employeeBySymbol,
        fetchedAt,
        stockAnalysisRouteResolver,
        fxRateService,
      ),
  );
  const companies = processingResults.map((result) => result.companyRecord);
  const stockAnalysisSnapshots = sortBySymbol(
    processingResults.map((result) => result.stockAnalysisSnapshot),
  );
  companies.sort((left, right) => left.rank - right.rank);
  const dataset = reconcileDatasetSourceTimestamps(
    createDataset(companies),
    maybePreviousDataset,
  );
  const publicDataset = buildPublicDataset(dataset);
  validateDatasetSemantics(publicDataset);

  if (!hasMaterialDatasetChanges(dataset, maybePreviousDataset)) {
    console.log(
      "No material dataset changes detected; skipping tracked writes and deploy inputs.",
    );
    return;
  }

  const { snapshotDirectory } = await prepareArchiveDirectories(now);
  await writeUniverseRawSnapshot(snapshotDirectory, universeBundle.raw);
  await writePublicDataset(publicDataset);
  const currencyAudit = buildDatasetCurrencyAuditSummary(publicDataset);

  // When the dataset materially changes, keep metadata.generatedAt tied to this
  // refresh run so the deployed UI reflects the latest published update time.
  await writeProcessedSnapshot(dataset, {
    generatedAt: fetchedAt,
    topN: DATA_CONFIG.topN,
    sourceSnapshotDirectory: path.relative(path.resolve("."), snapshotDirectory),
    stockAnalysisCoverage: {
      resolverStats: stockAnalysisRouteResolver.stats,
      resolvedRouteCount: stockAnalysisSnapshots.filter(
        (snapshot) => snapshot.resolvedBasePath !== null,
      ).length,
      annualEmployeeSeriesCount: stockAnalysisSnapshots.filter(
        (snapshot) => snapshot.counts.annualEmployees > 0,
      ).length,
    },
    currencyAudit,
  });
  await writeStockAnalysisRawSnapshot(snapshotDirectory, {
    enrichment: stockAnalysisSnapshots,
    routeResolverStats: stockAnalysisRouteResolver.stats,
    fxUsage: fxRateService.getUsageSnapshot(),
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
