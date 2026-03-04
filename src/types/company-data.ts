export type BucketType = "annual" | "quarterly";

export interface SourceAttribution {
  provider: string;
  url: string;
  fetchedAt: string;
  note?: string;
}

export interface MetricRecord {
  bucketId: string;
  bucketType: BucketType;
  marketCapUsd: number | null;
  revenueUsd: number | null;
  employeeCount: number | null;
  revenuePerEmployeeUsd: number | null;
  sources: {
    marketCap?: SourceAttribution;
    revenue?: SourceAttribution;
    employeeCount?: SourceAttribution;
  };
  flags: string[];
}

export interface CompanyRecord {
  id: string;
  rank: number;
  name: string;
  symbol: string;
  country: string;
  marketCapUsd: number;
  metrics: MetricRecord[];
}

export interface CompaniesDataset {
  generatedAt: string;
  topN: number;
  bucketIds: string[];
  companies: CompanyRecord[];
  sources: Array<{
    provider: string;
    description: string;
    homepage: string;
  }>;
}
