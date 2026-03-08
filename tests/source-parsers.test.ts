import { describe, expect, it } from "vitest";

import { __testing as companiesTesting } from "../scripts/data/sources/companies-marketcap";
import { __testing as stockAnalysisTesting } from "../scripts/data/sources/stockanalysis";

describe("CompaniesMarketCap source parser helpers", () => {
  it("builds slugs from company names", () => {
    expect(companiesTesting.toSlug("Meta Platforms (Facebook)")).toBe(
      "meta-platforms",
    );
    expect(companiesTesting.toSlug("JPMorgan Chase")).toBe("jpmorgan-chase");
  });

  it("extracts symbol-to-slug map from ranking html", () => {
    const html = `
      <a href="/nvidia/marketcap/">
        <div class="company-code"><span class="rank d-none"></span>NVDA</div>
      </a>
      <a href="/alphabet-google/marketcap/">
        <div class="company-code"><span class="rank d-none"></span>GOOG</div>
      </a>
    `;

    const slugBySymbol = companiesTesting.parseSlugMapFromRanking(html);
    expect(slugBySymbol.get("NVDA")).toBe("nvidia");
    expect(slugBySymbol.get("GOOG")).toBe("alphabet-google");
  });

  it("detects current-year TTM semantics and parses the tooltip period", () => {
    const html = `
      <h2><strong>Revenue in 2025 (TTM): <span class="background-ya">$187.14 Billion USD</span></strong></h2>
      <img class="in-text-tooltip ttm-dates-info-icon info-icon tooltip-title responsive-hidden" tooltip-title="1 Nov 2024 - 31 Oct 2025" src="/img/info-icon-grey.svg">
      <script>var data = {"2025":187142000000,"2024":130497000000};</script>
    `;

    expect(companiesTesting.parseCurrentRevenueYear(html)).toBe(2025);
    expect(companiesTesting.parseTtmPeriodRange(html)).toEqual({
      periodStart: "2024-11-01",
      periodEnd: "2025-10-31",
    });

    const annualRevenueByYear = companiesTesting.parseRevenueByYear(html);
    expect(annualRevenueByYear.get(2025)).toBe(187142000000);
    expect(annualRevenueByYear.get(2024)).toBe(130497000000);
  });

  it("still detects TTM semantics when the heading omits the literal TTM marker", () => {
    const html = `
      <h2><strong>Revenue in 2025: <span class="background-ya">$18.85 Billion USD</span></strong></h2>
      <p>According to the company's latest financial reports the company's current revenue (TTM
      <img class="in-text-tooltip ttm-dates-info-icon info-icon tooltip-title responsive-hidden" tooltip-title="1 Jan 2025 - 31 Dec 2025"></p>
    `;

    expect(companiesTesting.parseCurrentRevenueYear(html)).toBe(2025);
  });
});

describe("StockAnalysis source parser helpers", () => {
  it("extracts employee points and removes duplicate dates", () => {
    const html =
      'date:"2025-09-27",count:166000 date:"2025-09-27",count:166000 date:"2024-09-28",count:164000';
    const points = stockAnalysisTesting.parseEmployeePoints(html);
    expect(points).toEqual([
      { date: "2025-09-27", count: 166000 },
      { date: "2024-09-28", count: 164000 },
    ]);
  });

  it("extracts stocks and quotes sitemap urls from sitemap index", () => {
    const sitemapIndex = `
      <loc>https://stockanalysis.com/sitemaps/stocks/stocks1.xml</loc>
      <loc>https://stockanalysis.com/sitemaps/quotes/quotes12.xml</loc>
      <loc>https://stockanalysis.com/sitemaps/pages.xml</loc>
    `;
    const urls = stockAnalysisTesting.parseSitemapUrls(sitemapIndex);
    expect(urls).toEqual([
      "https://stockanalysis.com/sitemaps/stocks/stocks1.xml",
      "https://stockanalysis.com/sitemaps/quotes/quotes12.xml",
    ]);
  });

  it("extracts revenue base paths from sitemap xml", () => {
    const sitemap = `
      <loc>https://stockanalysis.com/stocks/aapl/revenue/</loc>
      <loc>https://stockanalysis.com/quote/hkg/1398/revenue/</loc>
      <loc>https://stockanalysis.com/stocks/aapl/market-cap/</loc>
    `;
    const basePaths = stockAnalysisTesting.parseRevenueBasePaths(sitemap);
    expect(basePaths).toEqual(["/stocks/aapl", "/quote/hkg/1398"]);
  });

  it("normalizes symbol text to uppercase", () => {
    expect(stockAnalysisTesting.normalizeSymbol(" aapl ")).toBe("AAPL");
    expect(stockAnalysisTesting.normalizeSymbol("1398.hk")).toBe("1398.HK");
  });

  it("extracts page main and financial currencies", () => {
    const html =
      'symbol:"TM",curr:{main:"USD",price:"USD",dividend:"USD",financial:"JPY"},stream:true';

    expect(stockAnalysisTesting.parsePageCurrencies(html)).toEqual({
      main: "USD",
      financial: "JPY",
    });
  });

  it("prefers quote routes for suffix tickers before falling back to stock routes", () => {
    const stockRoutes = new Map([
      ["MC", "/stocks/mc"],
      ["TM", "/stocks/tm"],
      ["DTE", "/stocks/dte"],
    ]);
    const quoteRoutes = new Map([
      ["epa:MC", "/quote/epa/mc"],
      ["etr:DTE", "/quote/etr/dte"],
    ]);
    const uniqueRoutes = new Map<string, string>();

    expect(
      stockAnalysisTesting.resolveBasePathForSymbol(
        "MC.PA",
        stockRoutes,
        quoteRoutes,
        uniqueRoutes,
      ),
    ).toBe("/quote/epa/mc");
    expect(
      stockAnalysisTesting.resolveBasePathForSymbol(
        "DTE.DE",
        stockRoutes,
        quoteRoutes,
        uniqueRoutes,
      ),
    ).toBe("/quote/etr/dte");
    expect(
      stockAnalysisTesting.resolveBasePathForSymbol(
        "TM",
        stockRoutes,
        quoteRoutes,
        uniqueRoutes,
      ),
    ).toBe("/stocks/tm");
  });
});
