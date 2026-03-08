import { parse } from "csv-parse/sync";

import { DATA_CONFIG, SOURCE_URLS } from "../config";
import type { UniverseCompany } from "../types";

interface MarketCapCsvRow {
  Rank: string;
  Name: string;
  Symbol: string;
  marketcap: string;
  "price (USD)": string;
  country: string;
}

interface EmployeesCsvRow {
  Rank: string;
  Name: string;
  Symbol: string;
  employees_count: string;
  "price (USD)": string;
  country: string;
}

interface CompaniesMarketCapTtmRevenue {
  year: number;
  amount: number;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface CompaniesMarketCapRevenueSnapshot {
  annualRevenueByYear: Map<number, number>;
  ttmRevenue: CompaniesMarketCapTtmRevenue | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": DATA_CONFIG.userAgent,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  return await response.text();
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseSlugMapFromRanking(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const regex = /href="\/([^/"]+)\/marketcap\/"[\s\S]*?<div class="company-code">[\s\S]*?([A-Z0-9.\-]+)\s*<\/div>/g;
  for (const match of html.matchAll(regex)) {
    const [, slug, symbol] = match;
    if (!map.has(symbol)) {
      map.set(symbol, slug);
    }
  }

  return map;
}

function parseIsoDateFromHumanDate(maybeText: string | undefined): string | null {
  if (!maybeText) {
    return null;
  }

  const parsedDate = new Date(`${maybeText.trim()} UTC`);
  if (Number.isNaN(parsedDate.valueOf())) {
    return null;
  }

  return parsedDate.toISOString().slice(0, 10);
}

function parseCurrentRevenueYear(html: string): number | null {
  const maybeMatch = html.match(/Revenue in (\d{4}) \(TTM\)/i);
  if (!maybeMatch) {
    return null;
  }

  const year = Number(maybeMatch[1]);
  return Number.isInteger(year) ? year : null;
}

function parseTtmPeriodRange(html: string): {
  periodStart: string | null;
  periodEnd: string | null;
} {
  const maybeMatch = html.match(
    /tooltip-title="(\d{1,2} [A-Z][a-z]{2} \d{4}) - (\d{1,2} [A-Z][a-z]{2} \d{4})"/,
  );
  if (!maybeMatch) {
    return {
      periodStart: null,
      periodEnd: null,
    };
  }

  return {
    periodStart: parseIsoDateFromHumanDate(maybeMatch[1]),
    periodEnd: parseIsoDateFromHumanDate(maybeMatch[2]),
  };
}

function parseRevenueByYear(html: string): Map<number, number> {
  const match = html.match(/data = (\{[^;]+\});/);
  if (!match) {
    return new Map<number, number>();
  }

  const revenueByYear = JSON.parse(match[1]) as Record<string, number>;
  const map = new Map<number, number>();
  for (const [yearText, revenue] of Object.entries(revenueByYear)) {
    const year = Number(yearText);
    if (Number.isFinite(year) && Number.isFinite(revenue)) {
      map.set(year, revenue);
    }
  }

  return map;
}

export async function fetchUniverseWithEmployeeSnapshot(): Promise<{
  companies: UniverseCompany[];
  employeeBySymbol: Map<string, number>;
  raw: {
    rankingCsv: string;
    employeesCsv: string;
    rankingHtml: string;
  };
}> {
  const rankingCsv = await fetchText(SOURCE_URLS.companiesMarketCapRankingCsv);
  await sleep(DATA_CONFIG.requestDelayMs);
  const employeesCsv = await fetchText(SOURCE_URLS.companiesMarketCapEmployeesCsv);
  await sleep(DATA_CONFIG.requestDelayMs);
  const rankingHtml = await fetchText(SOURCE_URLS.companiesMarketCapRankingHtml);

  const slugBySymbol = parseSlugMapFromRanking(rankingHtml);

  const rankingRows = parse(rankingCsv, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    skip_records_with_error: true,
  }) as MarketCapCsvRow[];

  const companies = rankingRows.slice(0, DATA_CONFIG.topN).map((row) => {
    const rank = Number(row.Rank);
    const symbol = row.Symbol.trim();
    const slug = slugBySymbol.get(symbol) ?? toSlug(row.Name);
    return {
      rank,
      name: row.Name.trim(),
      symbol,
      country: row.country.trim(),
      marketCapUsd: Number(row.marketcap),
      slug,
    };
  });

  const employeeRows = parse(employeesCsv, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    skip_records_with_error: true,
  }) as EmployeesCsvRow[];

  const employeeBySymbol = new Map<string, number>();
  for (const row of employeeRows) {
    const maybeCount = Number(row.employees_count);
    if (!Number.isNaN(maybeCount) && maybeCount > 0 && !employeeBySymbol.has(row.Symbol)) {
      employeeBySymbol.set(row.Symbol.trim(), maybeCount);
    }
  }

  return {
    companies,
    employeeBySymbol,
    raw: {
      rankingCsv,
      employeesCsv,
      rankingHtml,
    },
  };
}

export async function fetchRevenueSnapshotFromCompaniesMarketCap(
  slug: string,
): Promise<CompaniesMarketCapRevenueSnapshot> {
  const url = `https://companiesmarketcap.com/${slug}/revenue/`;
  const html = await fetchText(url);
  const annualRevenueByYear = parseRevenueByYear(html);
  const currentTtmYear = parseCurrentRevenueYear(html);
  const maybeTtmAmount =
    currentTtmYear === null ? null : annualRevenueByYear.get(currentTtmYear) ?? null;

  if (currentTtmYear !== null) {
    annualRevenueByYear.delete(currentTtmYear);
  }

  return {
    annualRevenueByYear,
    ttmRevenue:
      currentTtmYear !== null &&
      maybeTtmAmount !== null &&
      Number.isFinite(maybeTtmAmount)
        ? {
            year: currentTtmYear,
            amount: maybeTtmAmount,
            ...parseTtmPeriodRange(html),
          }
        : null,
  };
}

export const __testing = {
  toSlug,
  parseSlugMapFromRanking,
  parseCurrentRevenueYear,
  parseIsoDateFromHumanDate,
  parseRevenueByYear,
  parseTtmPeriodRange,
};
