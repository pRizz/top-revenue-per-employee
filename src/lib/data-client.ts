import type { CompaniesDataset } from "@/types/company-data";

let maybeCachedDataset: CompaniesDataset | null = null;

export async function getDataset(): Promise<CompaniesDataset> {
  if (maybeCachedDataset) {
    return maybeCachedDataset;
  }

  const response = await fetch(`${import.meta.env.BASE_URL}data/companies-data.json`);
  if (!response.ok) {
    throw new Error(`Failed to load dataset: ${response.status}`);
  }

  const json = (await response.json()) as CompaniesDataset;
  maybeCachedDataset = json;
  return json;
}
