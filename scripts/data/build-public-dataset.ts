import fs from "node:fs/promises";
import path from "node:path";

import type { NormalizedDataset } from "./types";
import type { CompaniesDataset } from "../../src/types/company-data";

export async function writePublicDataset(
  dataset: NormalizedDataset,
): Promise<CompaniesDataset> {
  const withMetadata: CompaniesDataset = {
    generatedAt: dataset.generatedAt,
    topN: dataset.topN,
    bucketIds: dataset.bucketIds,
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

  const outputDirectory = path.resolve("public", "data");
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(
    path.join(outputDirectory, "companies-data.json"),
    JSON.stringify(withMetadata, null, 2),
    "utf8",
  );

  return withMetadata;
}
