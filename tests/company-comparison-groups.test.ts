import { describe, expect, it } from "vitest";

import { buildCompanyComparisonGroups } from "@/lib/company-comparison-groups";
import type { CompanyRecord } from "@/types/company-data";

function createCompany(
  rank: number,
  symbol: string,
  country: string,
): CompanyRecord {
  return {
    id: `${symbol}-${rank}`,
    rank,
    name: `${symbol} Holdings`,
    symbol,
    country,
    marketCapUsd: rank * 1_000_000,
    metrics: [],
  };
}

const sampleCompanies: CompanyRecord[] = [
  createCompany(1, "NVDA", "United States"),
  createCompany(2, "AAPL", "United States"),
  createCompany(3, "GOOG", "United States"),
  createCompany(4, "MSFT", "United States"),
  createCompany(5, "AMZN", "United States"),
  createCompany(6, "TSM", "Taiwan"),
  createCompany(7, "2222.SR", "Saudi Arabia"),
  createCompany(8, "META", "United States"),
  createCompany(9, "AVGO", "United States"),
  createCompany(10, "TSLA", "United States"),
  createCompany(11, "JPM", "United States"),
  createCompany(12, "ASML", "Netherlands"),
  createCompany(13, "005930.KS", "South Korea"),
  createCompany(14, "000660.KS", "South Korea"),
  createCompany(15, "BABA", "China"),
  createCompany(16, "TCEHY", "China"),
  createCompany(17, "MC.PA", "France"),
  createCompany(18, "RMS.PA", "France"),
  createCompany(19, "OR.PA", "France"),
  createCompany(20, "ITX.MC", "Spain"),
  createCompany(21, "CVX", "United States"),
  createCompany(22, "SHEL", "United Kingdom"),
  createCompany(23, "V", "United States"),
  createCompany(24, "MA", "United States"),
  createCompany(25, "AXP", "United States"),
  createCompany(26, "BAC", "United States"),
  createCompany(27, "HSBC", "United Kingdom"),
  createCompany(28, "RY", "Canada"),
];

function getGroupSymbols(
  companies: CompanyRecord[],
  groupId: string,
): string[] | undefined {
  return buildCompanyComparisonGroups(companies).find((group) => group.id === groupId)
    ?.companySymbols;
}

describe("buildCompanyComparisonGroups", () => {
  it("builds the Mag 7 and MAGNAT presets from available symbols", () => {
    expect(getGroupSymbols(sampleCompanies, "mag-7")).toEqual([
      "NVDA",
      "AAPL",
      "GOOG",
      "MSFT",
      "AMZN",
      "META",
      "TSLA",
    ]);

    expect(getGroupSymbols(sampleCompanies, "magnat")).toEqual([
      "NVDA",
      "AAPL",
      "GOOG",
      "MSFT",
      "AMZN",
      "TSLA",
    ]);
  });

  it("uses the highest-ranked United States companies for S&P presets", () => {
    expect(getGroupSymbols(sampleCompanies, "sp-10")).toEqual([
      "NVDA",
      "AAPL",
      "GOOG",
      "MSFT",
      "AMZN",
      "META",
      "AVGO",
      "TSLA",
      "JPM",
      "CVX",
    ]);
  });

  it("builds international and sector baskets from the live roster", () => {
    expect(getGroupSymbols(sampleCompanies, "european-luxury")).toEqual([
      "MC.PA",
      "RMS.PA",
      "OR.PA",
      "ITX.MC",
    ]);

    expect(getGroupSymbols(sampleCompanies, "global-semiconductors")).toEqual([
      "NVDA",
      "TSM",
      "AVGO",
      "ASML",
      "005930.KS",
      "000660.KS",
    ]);
  });

  it("omits presets that do not have at least two available companies", () => {
    expect(buildCompanyComparisonGroups([createCompany(1, "AAPL", "United States")])).toEqual([]);
  });
});
