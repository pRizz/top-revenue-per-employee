import fs from "node:fs/promises";
import path from "node:path";

import type { NormalizedDataset } from "./types";
import type { CompaniesDataset } from "../../src/types/company-data";

export function buildPublicDataset(
  dataset: NormalizedDataset,
): CompaniesDataset {
  return {
    generatedAt: dataset.generatedAt,
    topN: dataset.topN,
    bucketIds: dataset.bucketIds,
    buckets: dataset.buckets,
    companies: dataset.companies,
    sources: [
      {
        provider: "CompaniesMarketCap",
        description:
          "Top company universe and fallback employee snapshots.",
        homepage: "https://companiesmarketcap.com/",
      },
      {
        provider: "StockAnalysis",
        description: "Quarterly/annual revenue and market-cap series enrichment.",
        homepage: "https://stockanalysis.com/",
      },
    ],
  };
}

export async function writePublicDataset(dataset: CompaniesDataset): Promise<void> {
  const outputDirectory = path.resolve("public", "data");
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(
    path.join(outputDirectory, "companies-data.json"),
    JSON.stringify(dataset, null, 2),
    "utf8",
  );
}
