import type {
  BucketType,
  CompanyRecord,
  MetricRecord,
} from "../../src/types/company-data";

export interface UniverseCompany {
  rank: number;
  name: string;
  symbol: string;
  country: string;
  marketCapUsd: number;
  slug: string;
}

export interface SourceMap {
  marketCap?: MetricRecord["sources"]["marketCap"];
  revenue?: MetricRecord["sources"]["revenue"];
  employeeCount?: MetricRecord["sources"]["employeeCount"];
}

export interface MetricAccumulator {
  bucketId: string;
  bucketType: BucketType;
  marketCapUsd: number | null;
  revenueUsd: number | null;
  employeeCount: number | null;
  sources: SourceMap;
  flags: string[];
}

export interface NormalizedDataset {
  generatedAt: string;
  topN: number;
  bucketIds: string[];
  companies: CompanyRecord[];
}
