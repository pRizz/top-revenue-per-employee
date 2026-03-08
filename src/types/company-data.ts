export type BucketType = "annual" | "quarterly" | "ttm";

export type CurrencyCode = string;

export type MoneyNormalizationMethod =
  | "reported_usd"
  | "fx_converted"
  | "snapshot_fallback"
  | "unavailable";

export type FxAggregationMethod =
  | "point_in_time"
  | "month_end_average"
  | "fixed_peg";

export interface FxConversionMetadata {
  provider: string;
  quoteCurrency: "USD";
  rate: number;
  asOf: string;
  aggregation: FxAggregationMethod;
  rangeStart?: string;
  rangeEnd?: string;
  sampleCount?: number;
  expectedSampleCount?: number;
  coverageStatus?: "complete" | "partial";
}

export interface MonetaryAmount {
  reportedAmount: number;
  reportedCurrency: CurrencyCode;
  usdAmount: number | null;
  normalizationMethod: MoneyNormalizationMethod;
  fx?: FxConversionMetadata;
}

export interface SourceAttribution {
  provider: string;
  url: string;
  fetchedAt: string;
  note?: string;
}

export interface DatasetBucket {
  id: string;
  bucketType: BucketType;
  label: string;
}

export interface MetricRecord {
  bucketId: string;
  bucketType: BucketType;
  periodStart: string | null;
  periodEnd: string | null;
  displayLabel: string;
  marketCap: MonetaryAmount | null;
  revenue: MonetaryAmount | null;
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
  buckets: DatasetBucket[];
  companies: CompanyRecord[];
  sources: Array<{
    provider: string;
    description: string;
    homepage: string;
  }>;
}
