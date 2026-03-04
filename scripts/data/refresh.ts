import fs from "node:fs/promises";
import path from "node:path";

import { writePublicDataset } from "./build-public-dataset";
import { DATA_CONFIG } from "./config";
import {
  accumulatorMapToMetrics,
  annualBucketForDate,
  bucketForDate,
  createDataset,
  createEmptyAccumulatorMap,
  toCompanyRecord,
} from "./normalize";
import {
  fetchAnnualRevenueFromCompaniesMarketCap,
  fetchUniverseWithEmployeeSnapshot,
} from "./sources/companies-marketcap";
import { fetchStockAnalysisSeries } from "./sources/stockanalysis";
import type { UniverseCompany } from "./types";
import { validatePublicDataset } from "./validate";

function todayDirectoryName(): string {
  return new Date().toISOString().slice(0, 10);
}

async function ensureDirectory(pathLike: string): Promise<void> {
  await fs.mkdir(pathLike, { recursive: true });
}

function fillFallbackMarketCap(
  map: ReturnType<typeof createEmptyAccumulatorMap>,
  company: UniverseCompany,
  fetchedAt: string,
): void {
  for (const entry of map.values()) {
    entry.marketCapUsd = company.marketCapUsd;
    entry.sources.marketCap = {
      provider: "CompaniesMarketCap",
      url: "https://companiesmarketcap.com/?download=csv",
      fetchedAt,
      note: "current snapshot fallback",
    };
    entry.flags.push("market_cap_snapshot_fallback");
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
    entry.flags.push("employee_snapshot_fallback");
  }
}

async function processCompany(
  company: UniverseCompany,
  employeeBySymbol: Map<string, number>,
  fetchedAt: string,
): Promise<ReturnType<typeof toCompanyRecord>> {
  const accumulatorMap = createEmptyAccumulatorMap();
  fillFallbackMarketCap(accumulatorMap, company, fetchedAt);
  fillFallbackEmployees(accumulatorMap, employeeBySymbol.get(company.symbol), fetchedAt);

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

      maybeEntry.revenueUsd = revenue;
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
    const stockAnalysis = await fetchStockAnalysisSeries(company.symbol);
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

        maybeEntry.revenueUsd = point.revenue;
        maybeEntry.sources.revenue = {
          provider: "StockAnalysis",
          url: `${baseUrl}/revenue/`,
          fetchedAt,
        };
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

        maybeEntry.revenueUsd = point.revenue;
        maybeEntry.sources.revenue = {
          provider: "StockAnalysis",
          url: `${baseUrl}/revenue/`,
          fetchedAt,
        };
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

        maybeEntry.marketCapUsd = point.v;
        maybeEntry.sources.marketCap = {
          provider: "StockAnalysis",
          url: `${baseUrl}/market-cap/`,
          fetchedAt,
        };
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

        maybeEntry.marketCapUsd = point.v;
        maybeEntry.sources.marketCap = {
          provider: "StockAnalysis",
          url: `${baseUrl}/market-cap/`,
          fetchedAt,
        };
      }
    }
  } catch {
    // Keep fallback values if enrichment fails.
  }

  const metrics = accumulatorMapToMetrics(accumulatorMap);
  return toCompanyRecord(company, metrics);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  const queue = [...items];

  const runners = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const maybeItem = queue.shift();
      if (!maybeItem) {
        return;
      }

      const result = await worker(maybeItem);
      results.push(result);
    }
  });

  await Promise.all(runners);
  return results;
}

async function main(): Promise<void> {
  const fetchedAt = new Date().toISOString();
  const snapshotDirectory = path.resolve("data", "raw", todayDirectoryName());
  await ensureDirectory(snapshotDirectory);
  await ensureDirectory(path.resolve("data", "processed"));

  const universeBundle = await fetchUniverseWithEmployeeSnapshot();

  await fs.writeFile(
    path.join(snapshotDirectory, "companies-marketcap-ranking.csv"),
    universeBundle.raw.rankingCsv,
    "utf8",
  );
  await fs.writeFile(
    path.join(snapshotDirectory, "companies-marketcap-employees.csv"),
    universeBundle.raw.employeesCsv,
    "utf8",
  );
  await fs.writeFile(
    path.join(snapshotDirectory, "companies-marketcap-ranking.html"),
    universeBundle.raw.rankingHtml,
    "utf8",
  );

  const companies = await mapWithConcurrency(
    universeBundle.companies,
    8,
    async (company) =>
      await processCompany(company, universeBundle.employeeBySymbol, fetchedAt),
  );

  companies.sort((left, right) => left.rank - right.rank);
  const dataset = createDataset(companies);

  await fs.writeFile(
    path.resolve("data", "processed", "companies-timeseries.json"),
    JSON.stringify(dataset, null, 2),
    "utf8",
  );

  await fs.writeFile(
    path.resolve("data", "processed", "metadata.json"),
    JSON.stringify(
      {
        generatedAt: fetchedAt,
        topN: DATA_CONFIG.topN,
        sourceSnapshotDirectory: path.relative(path.resolve("."), snapshotDirectory),
      },
      null,
      2,
    ),
    "utf8",
  );

  await writePublicDataset(dataset);
  await validatePublicDataset();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
