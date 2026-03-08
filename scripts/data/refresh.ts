import path from "node:path";

import {
  prepareArchiveDirectories,
  writeProcessedSnapshot,
  writeStockAnalysisRawSnapshot,
  writeUniverseRawSnapshot,
} from "./archive";
import { writePublicDataset } from "./build-public-dataset";
import { DATA_CONFIG } from "./config";
import { FxRateService } from "./fx";
import {
  accumulatorMapToMetrics,
  annualBucketForDate,
  bucketDateRange,
  bucketForDate,
  createDataset,
  createEmptyAccumulatorMap,
  toCompanyRecord,
} from "./normalize";
import {
  readPreviousProcessedDataset,
  reconcileDatasetSourceTimestamps,
} from "./dataset-stability";
import { mapWithConcurrency, sortBySymbol } from "./order-utils";
import {
  fetchAnnualRevenueFromCompaniesMarketCap,
  fetchUniverseWithEmployeeSnapshot,
} from "./sources/companies-marketcap";
import {
  createStockAnalysisRouteResolver,
  fetchStockAnalysisSeries,
  type StockAnalysisRouteResolver,
} from "./sources/stockanalysis";
import type { UniverseCompany } from "./types";
import { validatePublicDataset } from "./validate";
import type { MonetaryAmount } from "@/types/company-data";

interface StockAnalysisSnapshot {
  symbol: string;
  resolvedBasePath: string | null;
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
  entry: { revenue: MonetaryAmount | null; flags: string[] },
  reportedAmount: number,
  reportedCurrency: string | null,
): void {
  entry.revenue = {
    reportedAmount,
    reportedCurrency: reportedCurrency ?? "UNKNOWN",
    usdAmount: null,
    normalizationMethod: "unavailable",
  };
  addFlag(entry, "revenue_currency_conversion_unavailable");
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
  };

  try {
    const annualRevenue = await fetchAnnualRevenueFromCompaniesMarketCap(company.slug);
    for (const [year, revenue] of annualRevenue.entries()) {
      const bucketId = String(year);
      const maybeEntry = accumulatorMap.get(bucketId);
      if (!maybeEntry) {
        continue;
      }

      if (revenue <= 0) {
        continue;
      }

      maybeEntry.revenue = createUsdMoney(revenue, "reported_usd");
      maybeEntry.sources.revenue = {
        provider: "CompaniesMarketCap",
        url: `https://companiesmarketcap.com/${company.slug}/revenue/`,
        fetchedAt,
      };
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
    if (stockAnalysis.resolvedBasePath) {
      const baseUrl = `https://stockanalysis.com${stockAnalysis.resolvedBasePath}`;

      for (const point of stockAnalysis.quarterlyRevenue) {
        const maybeBucketId = bucketForDate(point.date);
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

        const maybeRange = bucketDateRange(maybeBucketId);
        if (!maybeRange) {
          continue;
        }

        const revenue = await fxRateService.toComparableMoney(
          point.revenue,
          stockAnalysis.currencies.financial ?? "UNKNOWN",
          "month_end_average",
          {
            rangeStart: maybeRange.startDate,
            rangeEnd: maybeRange.endDate,
          },
        );

        if (revenue.usdAmount === null) {
          recordUnavailableRevenue(
            maybeEntry,
            point.revenue,
            stockAnalysis.currencies.financial,
          );
          continue;
        }

        maybeEntry.revenue = revenue;
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

      for (const point of stockAnalysis.annualRevenue) {
        const maybeBucketId = annualBucketForDate(point.date);
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

        const maybeRange = bucketDateRange(maybeBucketId);
        if (!maybeRange) {
          continue;
        }

        const revenue = await fxRateService.toComparableMoney(
          point.revenue,
          stockAnalysis.currencies.financial ?? "UNKNOWN",
          "month_end_average",
          {
            rangeStart: maybeRange.startDate,
            rangeEnd: maybeRange.endDate,
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

          continue;
        }

        if (revenue.usdAmount === null) {
          recordUnavailableRevenue(
            maybeEntry,
            point.revenue,
            stockAnalysis.currencies.financial,
          );
          continue;
        }

        maybeEntry.revenue = revenue;
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

      for (const point of stockAnalysis.quarterlyMarketCap) {
        const maybeBucketId = bucketForDate(point.d);
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

      for (const point of stockAnalysis.annualMarketCap) {
        const maybeBucketId = annualBucketForDate(point.d);
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

      for (const point of stockAnalysis.annualEmployees) {
        const maybeBucketId = annualBucketForDate(point.date);
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
  const { snapshotDirectory } = await prepareArchiveDirectories(now);
  const maybePreviousDataset = await readPreviousProcessedDataset();

  const universeBundle = await fetchUniverseWithEmployeeSnapshot();
  const stockAnalysisRouteResolver = await createStockAnalysisRouteResolver();
  const fxRateService = new FxRateService();

  await writeUniverseRawSnapshot(snapshotDirectory, universeBundle.raw);

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

  // Keep metadata.generatedAt tied to the current refresh run so the UI can
  // continue showing "Last refreshed" even when nested metric source
  // timestamps are preserved for unchanged data.
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
  });
  await writeStockAnalysisRawSnapshot(snapshotDirectory, {
    enrichment: stockAnalysisSnapshots,
    routeResolverStats: stockAnalysisRouteResolver.stats,
    fxUsage: fxRateService.getUsageSnapshot(),
  });

  await writePublicDataset(dataset);
  await validatePublicDataset();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
