import { DATA_CONFIG, SOURCE_URLS } from "../config";
import type { CurrencyCode } from "@/types/company-data";

interface RevenuePoint {
  date: string;
  revenue: number;
}

interface MarketCapPoint {
  d: string;
  v: number;
}

interface EmployeePoint {
  date: string;
  count: number;
}

interface StockAnalysisSeries {
  resolvedBasePath: string | null;
  currencies: {
    main: CurrencyCode | null;
    financial: CurrencyCode | null;
  };
  quarterlyRevenue: RevenuePoint[];
  annualRevenue: RevenuePoint[];
  quarterlyMarketCap: MarketCapPoint[];
  annualMarketCap: MarketCapPoint[];
  annualEmployees: EmployeePoint[];
}

interface RouteResolverStats {
  stockRoutesIndexed: number;
  quoteRoutesIndexed: number;
  uniqueSymbolRoutes: number;
}

export interface StockAnalysisRouteResolver {
  resolveBasePath: (symbol: string) => string | null;
  stats: RouteResolverStats;
}

const exchangeByTickerSuffix: Record<string, string> = {
  HK: "hkg",
  KS: "krx",
  SS: "sse",
  SZ: "szse",
  TW: "tpe",
  SR: "tadawul",
  SW: "swx",
  PA: "epa",
  DE: "xetra",
  AS: "ams",
  L: "lse",
  NS: "nse",
  BO: "bse",
  TO: "tsx",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url: string): Promise<string | null> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": DATA_CONFIG.userAgent,
    },
  });
  if (!response.ok) {
    return null;
  }

  return await response.text();
}

function extractArrayLiteralByKey(html: string, key: string): string | null {
  const keyIndex = html.indexOf(`${key}:[`);
  if (keyIndex < 0) {
    return null;
  }

  const start = html.indexOf("[", keyIndex);
  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let previousChar = "";

  for (let index = start; index < html.length; index += 1) {
    const currentChar = html[index];
    if (currentChar === '"' && previousChar !== "\\") {
      inString = !inString;
    }

    if (!inString) {
      if (currentChar === "[") {
        depth += 1;
      } else if (currentChar === "]") {
        depth -= 1;
        if (depth === 0) {
          return html.slice(start, index + 1);
        }
      }
    }

    previousChar = currentChar;
  }

  return null;
}

function parseArrayLiteral<T>(maybeArrayLiteral: string | null): T[] {
  if (!maybeArrayLiteral) {
    return [];
  }

  try {
    return Function(`"use strict"; return (${maybeArrayLiteral});`)() as T[];
  } catch {
    return [];
  }
}

function parseEmployeePoints(html: string): EmployeePoint[] {
  const regex = /date:"(\d{4}-\d{2}-\d{2})",count:(\d+)/g;
  const points: EmployeePoint[] = [];
  const seenDates = new Set<string>();

  for (const match of html.matchAll(regex)) {
    const date = match[1];
    const count = Number(match[2]);
    if (!Number.isFinite(count) || count <= 0 || seenDates.has(date)) {
      continue;
    }

    points.push({ date, count });
    seenDates.add(date);
  }

  return points;
}

function parsePageCurrencies(html: string): {
  main: CurrencyCode | null;
  financial: CurrencyCode | null;
} {
  const match = html.match(
    /curr:\{main:"([^"]+)",price:"[^"]+",dividend:"[^"]+",financial:"([^"]+)"\}/,
  );
  if (!match) {
    return {
      main: null,
      financial: null,
    };
  }

  return {
    main: match[1]?.trim().toUpperCase() ?? null,
    financial: match[2]?.trim().toUpperCase() ?? null,
  };
}

function parseSitemapUrls(indexXml: string): string[] {
  const urls: string[] = [];
  const regex = /<loc>(https:\/\/stockanalysis\.com\/sitemaps\/(?:stocks\/stocks\d+\.xml|quotes\/quotes\d+\.xml))<\/loc>/g;
  for (const match of indexXml.matchAll(regex)) {
    urls.push(match[1]);
  }

  return urls;
}

function parseRevenueBasePaths(sitemapXml: string): string[] {
  const basePaths: string[] = [];
  const regex = /<loc>https:\/\/stockanalysis\.com\/((?:stocks\/[^/]+|quote\/[^/]+\/[^/]+)\/revenue\/)<\/loc>/g;
  for (const match of sitemapXml.matchAll(regex)) {
    const routeWithRevenue = match[1].replace(/\/+$/, "");
    const basePath = `/${routeWithRevenue.replace(/\/revenue$/, "")}`;
    basePaths.push(basePath);
  }

  return basePaths;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export async function createStockAnalysisRouteResolver(): Promise<StockAnalysisRouteResolver> {
  const stockRouteBySymbol = new Map<string, string>();
  const quoteRouteByExchangeAndSymbol = new Map<string, string>();
  const routeCandidatesBySymbol = new Map<string, string[]>();

  const maybeSitemapIndex = await fetchText(`${SOURCE_URLS.stockAnalysisBase}/sitemap.xml`);
  if (!maybeSitemapIndex) {
    return {
      resolveBasePath: () => null,
      stats: {
        stockRoutesIndexed: 0,
        quoteRoutesIndexed: 0,
        uniqueSymbolRoutes: 0,
      },
    };
  }

  const sitemapUrls = parseSitemapUrls(maybeSitemapIndex);

  for (const sitemapUrl of sitemapUrls) {
    const maybeSitemapXml = await fetchText(sitemapUrl);
    await sleep(DATA_CONFIG.requestDelayMs);
    if (!maybeSitemapXml) {
      continue;
    }

    const basePaths = parseRevenueBasePaths(maybeSitemapXml);
    for (const basePath of basePaths) {
      if (basePath.startsWith("/stocks/")) {
        const symbol = normalizeSymbol(basePath.split("/")[2] ?? "");
        if (!symbol) {
          continue;
        }

        stockRouteBySymbol.set(symbol, basePath);
        const existingRoutes = routeCandidatesBySymbol.get(symbol) ?? [];
        existingRoutes.push(basePath);
        routeCandidatesBySymbol.set(symbol, existingRoutes);
        continue;
      }

      if (basePath.startsWith("/quote/")) {
        const [, , exchange, symbol] = basePath.split("/");
        const normalizedSymbol = normalizeSymbol(symbol ?? "");
        if (!exchange || !normalizedSymbol) {
          continue;
        }

        quoteRouteByExchangeAndSymbol.set(
          `${exchange}:${normalizedSymbol}`,
          basePath,
        );
        const existingRoutes = routeCandidatesBySymbol.get(normalizedSymbol) ?? [];
        existingRoutes.push(basePath);
        routeCandidatesBySymbol.set(normalizedSymbol, existingRoutes);
      }
    }
  }

  const uniqueRouteBySymbol = new Map<string, string>();
  for (const [symbol, routes] of routeCandidatesBySymbol.entries()) {
    const uniqueRoutes = [...new Set(routes)];
    if (uniqueRoutes.length === 1) {
      uniqueRouteBySymbol.set(symbol, uniqueRoutes[0]);
    }
  }

  const resolveBasePath = (rawSymbol: string): string | null => {
    const symbol = normalizeSymbol(rawSymbol);
    const [tickerBase, maybeSuffix] = symbol.split(".");

    if (stockRouteBySymbol.has(symbol)) {
      return stockRouteBySymbol.get(symbol) ?? null;
    }

    if (tickerBase && stockRouteBySymbol.has(tickerBase)) {
      return stockRouteBySymbol.get(tickerBase) ?? null;
    }

    if (maybeSuffix) {
      const maybeExchange = exchangeByTickerSuffix[maybeSuffix];
      if (maybeExchange) {
        const maybeRoute = quoteRouteByExchangeAndSymbol.get(
          `${maybeExchange}:${tickerBase}`,
        );
        if (maybeRoute) {
          return maybeRoute;
        }
      }
    }

    if (tickerBase && uniqueRouteBySymbol.has(tickerBase)) {
      return uniqueRouteBySymbol.get(tickerBase) ?? null;
    }

    if (symbol && uniqueRouteBySymbol.has(symbol)) {
      return uniqueRouteBySymbol.get(symbol) ?? null;
    }

    return null;
  };

  return {
    resolveBasePath,
    stats: {
      stockRoutesIndexed: stockRouteBySymbol.size,
      quoteRoutesIndexed: quoteRouteByExchangeAndSymbol.size,
      uniqueSymbolRoutes: uniqueRouteBySymbol.size,
    },
  };
}

function candidateBasePaths(symbol: string): string[] {
  const symbolLower = symbol.toLowerCase();
  const symbolUpper = symbol.toUpperCase();
  const candidates: string[] = [`/stocks/${symbolLower}`];

  const [tickerBase, maybeSuffix] = symbolUpper.split(".");
  if (maybeSuffix) {
    const maybeExchange = exchangeByTickerSuffix[maybeSuffix];
    if (maybeExchange) {
      candidates.push(`/quote/${maybeExchange}/${tickerBase}`);
    }
  } else {
    candidates.push(`/quote/otc/${symbolUpper}`);
  }

  return [...new Set(candidates)];
}

async function resolveStockAnalysisBasePath(symbol: string): Promise<string | null> {
  for (const candidate of candidateBasePaths(symbol)) {
    const maybeHtml = await fetchText(
      `${SOURCE_URLS.stockAnalysisBase}${candidate}/revenue/`,
    );
    await sleep(DATA_CONFIG.requestDelayMs);
    if (maybeHtml) {
      return candidate;
    }
  }

  return null;
}

export async function fetchStockAnalysisSeries(
  symbol: string,
  routeResolver: StockAnalysisRouteResolver | null,
): Promise<StockAnalysisSeries> {
  const resolvedBasePath =
    routeResolver?.resolveBasePath(symbol) ??
    (await resolveStockAnalysisBasePath(symbol));
  if (!resolvedBasePath) {
    return {
      resolvedBasePath: null,
      currencies: {
        main: null,
        financial: null,
      },
      quarterlyRevenue: [],
      annualRevenue: [],
      quarterlyMarketCap: [],
      annualMarketCap: [],
      annualEmployees: [],
    };
  }

  const revenueHtml = await fetchText(
    `${SOURCE_URLS.stockAnalysisBase}${resolvedBasePath}/revenue/`,
  );
  await sleep(DATA_CONFIG.requestDelayMs);
  const marketCapHtml = await fetchText(
    `${SOURCE_URLS.stockAnalysisBase}${resolvedBasePath}/market-cap/`,
  );
  await sleep(DATA_CONFIG.requestDelayMs);
  const employeesHtml = await fetchText(
    `${SOURCE_URLS.stockAnalysisBase}${resolvedBasePath}/employees/`,
  );

  const quarterlyRevenue = parseArrayLiteral<RevenuePoint>(
    extractArrayLiteralByKey(revenueHtml ?? "", "quarterly"),
  );
  const annualRevenue = parseArrayLiteral<RevenuePoint>(
    extractArrayLiteralByKey(revenueHtml ?? "", "annual"),
  );
  const quarterlyMarketCap = parseArrayLiteral<MarketCapPoint>(
    extractArrayLiteralByKey(marketCapHtml ?? "", "quarterly"),
  );
  const annualMarketCap = parseArrayLiteral<MarketCapPoint>(
    extractArrayLiteralByKey(marketCapHtml ?? "", "annual"),
  );
  const annualEmployees = parseEmployeePoints(employeesHtml ?? "");
  const currencies = parsePageCurrencies(
    revenueHtml ?? marketCapHtml ?? employeesHtml ?? "",
  );

  return {
    resolvedBasePath,
    currencies,
    quarterlyRevenue,
    annualRevenue,
    quarterlyMarketCap,
    annualMarketCap,
    annualEmployees,
  };
}

export const __testing = {
  parseEmployeePoints,
  parsePageCurrencies,
  parseSitemapUrls,
  parseRevenueBasePaths,
  normalizeSymbol,
};
