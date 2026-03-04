export const DATA_CONFIG = {
  topN: 100,
  annualYears: [2025, 2024],
  userAgent: "top-revenue-per-employee-bot/0.1 (github-actions)",
  requestDelayMs: 120,
} as const;

export const SOURCE_URLS = {
  companiesMarketCapRankingCsv: "https://companiesmarketcap.com/?download=csv",
  companiesMarketCapEmployeesCsv:
    "https://companiesmarketcap.com/largest-companies-by-number-of-employees/?download=csv",
  companiesMarketCapRankingHtml: "https://companiesmarketcap.com/",
  stockAnalysisBase: "https://stockanalysis.com",
};
