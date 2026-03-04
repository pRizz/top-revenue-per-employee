import { DATA_CONFIG, SOURCE_URLS } from "../config";

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
  quarterlyRevenue: RevenuePoint[];
  annualRevenue: RevenuePoint[];
  quarterlyMarketCap: MarketCapPoint[];
  annualMarketCap: MarketCapPoint[];
  annualEmployees: EmployeePoint[];
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
): Promise<StockAnalysisSeries> {
  const resolvedBasePath = await resolveStockAnalysisBasePath(symbol);
  if (!resolvedBasePath) {
    return {
      resolvedBasePath: null,
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

  return {
    resolvedBasePath,
    quarterlyRevenue,
    annualRevenue,
    quarterlyMarketCap,
    annualMarketCap,
    annualEmployees,
  };
}
