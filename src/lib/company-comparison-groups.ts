import type { CompanyRecord } from "@/types/company-data";

export type CompanyComparisonGroupCategory =
  | "featured"
  | "international"
  | "sector";

export interface CompanyComparisonGroup {
  id: string;
  label: string;
  description: string;
  category: CompanyComparisonGroupCategory;
  companyIds: string[];
  companySymbols: string[];
}

interface CompanyComparisonGroupDefinition {
  id: string;
  label: string;
  description: string;
  category: CompanyComparisonGroupCategory;
  selectCompanies: (helpers: CompanyGroupHelpers) => CompanyRecord[];
}

interface CompanyGroupHelpers {
  companiesBySymbols: (symbols: string[]) => CompanyRecord[];
  topCompaniesByCountry: (country: string, limit: number) => CompanyRecord[];
  topCompaniesByCountrySet: (
    countries: ReadonlySet<string>,
    limit: number,
  ) => CompanyRecord[];
}

export const companyComparisonGroupCategories: ReadonlyArray<{
  id: CompanyComparisonGroupCategory;
  label: string;
}> = [
  {
    id: "featured",
    label: "Featured",
  },
  {
    id: "international",
    label: "International",
  },
  {
    id: "sector",
    label: "Sectors",
  },
];

const europeCountries = new Set([
  "France",
  "Germany",
  "Netherlands",
  "Spain",
  "Switzerland",
  "United Kingdom",
]);

const asiaPacificCountries = new Set([
  "Australia",
  "China",
  "India",
  "Japan",
  "South Korea",
  "Taiwan",
]);

const gulfCountries = new Set(["Saudi Arabia", "United Arab Emirates"]);

const companyComparisonGroupDefinitions: ReadonlyArray<CompanyComparisonGroupDefinition> =
  [
    {
      id: "mag-7",
      label: "Mag 7",
      description:
        "Apple, Microsoft, Alphabet, Amazon, NVIDIA, Meta, and Tesla.",
      category: "featured",
      selectCompanies: ({ companiesBySymbols }) =>
        companiesBySymbols(["AAPL", "AMZN", "GOOG", "META", "MSFT", "NVDA", "TSLA"]),
    },
    {
      id: "magnat",
      label: "MAGNAT",
      description:
        "Microsoft, Apple, Alphabet, NVIDIA, Amazon, and Tesla.",
      category: "featured",
      selectCompanies: ({ companiesBySymbols }) =>
        companiesBySymbols(["MSFT", "AAPL", "GOOG", "NVDA", "AMZN", "TSLA"]),
    },
    {
      id: "sp-10",
      label: "S&P 10",
      description:
        "Top 10 highest-ranked United States companies currently in the dataset.",
      category: "featured",
      selectCompanies: ({ topCompaniesByCountry }) =>
        topCompaniesByCountry("United States", 10),
    },
    {
      id: "sp-20",
      label: "S&P 20",
      description:
        "Top 20 highest-ranked United States companies currently in the dataset.",
      category: "featured",
      selectCompanies: ({ topCompaniesByCountry }) =>
        topCompaniesByCountry("United States", 20),
    },
    {
      id: "ai-stack",
      label: "AI stack",
      description:
        "A mix of hyperscalers, model platforms, chip leaders, and AI infrastructure.",
      category: "featured",
      selectCompanies: ({ companiesBySymbols }) =>
        companiesBySymbols([
          "NVDA",
          "MSFT",
          "GOOG",
          "AMZN",
          "META",
          "TSM",
          "AVGO",
          "AMD",
          "ORCL",
          "PLTR",
        ]),
    },
    {
      id: "europe-leaders",
      label: "Europe leaders",
      description: "Highest-ranked European companies in the current dataset.",
      category: "international",
      selectCompanies: ({ topCompaniesByCountrySet }) =>
        topCompaniesByCountrySet(europeCountries, 10),
    },
    {
      id: "asia-pacific-leaders",
      label: "Asia-Pacific leaders",
      description:
        "Highest-ranked Asia-Pacific companies in the current dataset.",
      category: "international",
      selectCompanies: ({ topCompaniesByCountrySet }) =>
        topCompaniesByCountrySet(asiaPacificCountries, 10),
    },
    {
      id: "china-giants",
      label: "China giants",
      description: "Top China-based companies available in the dataset.",
      category: "international",
      selectCompanies: ({ topCompaniesByCountry }) =>
        topCompaniesByCountry("China", 8),
    },
    {
      id: "gulf-giants",
      label: "Gulf giants",
      description:
        "Large-cap names from Saudi Arabia and the United Arab Emirates.",
      category: "international",
      selectCompanies: ({ topCompaniesByCountrySet }) =>
        topCompaniesByCountrySet(gulfCountries, 8),
    },
    {
      id: "european-luxury",
      label: "European luxury",
      description:
        "European luxury, beauty, and fashion bellwethers like LVMH and Hermès.",
      category: "international",
      selectCompanies: ({ companiesBySymbols }) =>
        companiesBySymbols(["MC.PA", "RMS.PA", "OR.PA", "ITX.MC"]),
    },
    {
      id: "global-semiconductors",
      label: "Global semis",
      description:
        "Chip designers, foundries, memory leaders, and semiconductor equipment makers.",
      category: "sector",
      selectCompanies: ({ companiesBySymbols }) =>
        companiesBySymbols([
          "NVDA",
          "TSM",
          "AVGO",
          "ASML",
          "005930.KS",
          "000660.KS",
          "AMD",
          "MU",
          "AMAT",
          "LRCX",
          "KLAC",
          "TXN",
          "INTC",
        ]),
    },
    {
      id: "global-banks",
      label: "Global banks",
      description:
        "Money-center banks and large financial institutions across major regions.",
      category: "sector",
      selectCompanies: ({ companiesBySymbols }) =>
        companiesBySymbols([
          "JPM",
          "BAC",
          "WFC",
          "C",
          "GS",
          "MS",
          "HSBC",
          "RY",
          "MUFG",
          "CBA.AX",
        ]),
    },
    {
      id: "payments-rails",
      label: "Payments rails",
      description:
        "Card and payments-network leaders across consumer and enterprise spend.",
      category: "sector",
      selectCompanies: ({ companiesBySymbols }) =>
        companiesBySymbols(["V", "MA", "AXP"]),
    },
    {
      id: "pharma-heavyweights",
      label: "Pharma heavyweights",
      description:
        "Large biopharma and healthcare names with global therapeutic exposure.",
      category: "sector",
      selectCompanies: ({ companiesBySymbols }) =>
        companiesBySymbols([
          "LLY",
          "JNJ",
          "ABBV",
          "MRK",
          "NVS",
          "AZN",
          "AMGN",
          "ABT",
          "TMO",
          "GILD",
        ]),
    },
    {
      id: "oil-majors",
      label: "Oil majors",
      description:
        "Integrated energy majors spanning the United States, Europe, and Asia.",
      category: "sector",
      selectCompanies: ({ companiesBySymbols }) =>
        companiesBySymbols([
          "2222.SR",
          "XOM",
          "CVX",
          "SHEL",
          "0857.HK",
          "RELIANCE.NS",
        ]),
    },
    {
      id: "telecom-carriers",
      label: "Telecom carriers",
      description:
        "Large telecom operators across the United States, Europe, and China.",
      category: "sector",
      selectCompanies: ({ companiesBySymbols }) =>
        companiesBySymbols(["TMUS", "VZ", "T", "DTE.DE", "0941.HK"]),
    },
    {
      id: "consumer-staples",
      label: "Consumer staples",
      description:
        "Staples and everyday-consumption brands from retail, beverages, and packaged goods.",
      category: "sector",
      selectCompanies: ({ companiesBySymbols }) =>
        companiesBySymbols(["WMT", "COST", "PG", "KO", "PEP", "NESN.SW", "PM"]),
    },
  ];

function toSortedUniqueCompanies(companies: CompanyRecord[]): CompanyRecord[] {
  const seenCompanyIds = new Set<string>();

  return [...companies]
    .sort((left, right) => left.rank - right.rank)
    .filter((company) => {
      if (seenCompanyIds.has(company.id)) {
        return false;
      }

      seenCompanyIds.add(company.id);
      return true;
    });
}

/**
 * Builds reusable comparison baskets from the companies currently present in the dataset.
 */
export function buildCompanyComparisonGroups(
  companies: CompanyRecord[],
): CompanyComparisonGroup[] {
  const sortedCompanies = [...companies].sort((left, right) => left.rank - right.rank);
  const companyBySymbol = new Map(
    sortedCompanies.map((company) => [company.symbol, company]),
  );

  const helpers: CompanyGroupHelpers = {
    companiesBySymbols(symbols) {
      return symbols.flatMap((symbol) => {
        const maybeCompany = companyBySymbol.get(symbol);
        return maybeCompany ? [maybeCompany] : [];
      });
    },
    topCompaniesByCountry(country, limit) {
      return sortedCompanies
        .filter((company) => company.country === country)
        .slice(0, limit);
    },
    topCompaniesByCountrySet(countries, limit) {
      return sortedCompanies
        .filter((company) => countries.has(company.country))
        .slice(0, limit);
    },
  };

  return companyComparisonGroupDefinitions.flatMap((groupDefinition) => {
    const selectedCompanies = toSortedUniqueCompanies(
      groupDefinition.selectCompanies(helpers),
    );

    if (selectedCompanies.length < 2) {
      return [];
    }

    return [
      {
        id: groupDefinition.id,
        label: groupDefinition.label,
        description: groupDefinition.description,
        category: groupDefinition.category,
        companyIds: selectedCompanies.map((company) => company.id),
        companySymbols: selectedCompanies.map((company) => company.symbol),
      },
    ];
  });
}
