import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { CompaniesDataset, MetricRecord } from "@/types/company-data";

const bucketIdSchema = z.string().regex(/^\d{4}(Q[1-4])?$/);
const normalizationMethodSchema = z.enum([
  "reported_usd",
  "fx_converted",
  "snapshot_fallback",
  "unavailable",
]);
const fxAggregationSchema = z.enum([
  "point_in_time",
  "month_end_average",
  "fixed_peg",
]);

const moneySchema = z.object({
  reportedAmount: z.number().positive(),
  reportedCurrency: z.string().min(1),
  usdAmount: z.number().nonnegative().nullable(),
  normalizationMethod: normalizationMethodSchema,
  fx: z
    .object({
      provider: z.string(),
      quoteCurrency: z.literal("USD"),
      rate: z.number().positive(),
      asOf: z.string(),
      aggregation: fxAggregationSchema,
      rangeStart: z.string().optional(),
      rangeEnd: z.string().optional(),
      sampleCount: z.number().int().positive().optional(),
      expectedSampleCount: z.number().int().positive().optional(),
      coverageStatus: z.enum(["complete", "partial"]).optional(),
    })
    .optional(),
});

const sourceSchema = z.object({
  provider: z.string(),
  url: z.string(),
  fetchedAt: z.string(),
  note: z.string().optional(),
});

const datasetSchema = z.object({
  generatedAt: z.string(),
  topN: z.number().int().positive(),
  bucketIds: z.array(bucketIdSchema),
  companies: z.array(
    z.object({
      id: z.string(),
      rank: z.number().int().positive(),
      name: z.string(),
      symbol: z.string(),
      country: z.string(),
      marketCapUsd: z.number().nonnegative(),
      metrics: z.array(
        z.object({
          bucketId: bucketIdSchema,
          bucketType: z.enum(["annual", "quarterly"]),
          marketCap: moneySchema.nullable(),
          revenue: moneySchema.nullable(),
          marketCapUsd: z.number().nonnegative().nullable(),
          revenueUsd: z.number().nonnegative().nullable(),
          employeeCount: z.number().positive().nullable(),
          revenuePerEmployeeUsd: z.number().nonnegative().nullable(),
          sources: z.object({
            marketCap: sourceSchema.optional(),
            revenue: sourceSchema.optional(),
            employeeCount: sourceSchema.optional(),
          }),
          flags: z.array(z.string()),
        }),
      ),
    }),
  ),
});

function usdFieldForMetric(metric: MetricRecord, fieldName: "marketCap" | "revenue"): number | null {
  return fieldName === "marketCap" ? metric.marketCapUsd : metric.revenueUsd;
}

function flagForUnavailableConversion(fieldName: "marketCap" | "revenue"): string {
  return fieldName === "marketCap"
    ? "market_cap_currency_conversion_unavailable"
    : "revenue_currency_conversion_unavailable";
}

function validateMoney(
  metric: MetricRecord,
  fieldName: "marketCap" | "revenue",
  errors: string[],
): void {
  const maybeMoney = metric[fieldName];
  const usdField = usdFieldForMetric(metric, fieldName);

  if ((maybeMoney?.usdAmount ?? null) !== usdField) {
    errors.push(
      `${metric.bucketId}: ${fieldName} usdAmount does not match derived USD field`,
    );
  }

  if (!maybeMoney) {
    return;
  }

  if (
    (maybeMoney.normalizationMethod === "reported_usd" ||
      maybeMoney.normalizationMethod === "snapshot_fallback") &&
    (maybeMoney.reportedCurrency !== "USD" || maybeMoney.usdAmount !== maybeMoney.reportedAmount)
  ) {
    errors.push(
      `${metric.bucketId}: ${fieldName} marked as USD-native but values are inconsistent`,
    );
  }

  if (maybeMoney.normalizationMethod === "fx_converted") {
    if (maybeMoney.reportedCurrency === "USD") {
      errors.push(
        `${metric.bucketId}: ${fieldName} cannot be fx_converted from USD`,
      );
    }

    if (maybeMoney.usdAmount === null || !maybeMoney.fx) {
      errors.push(
        `${metric.bucketId}: ${fieldName} fx_converted value is missing FX metadata`,
      );
    }
  }

  if (maybeMoney.normalizationMethod === "unavailable" && maybeMoney.usdAmount !== null) {
    errors.push(
      `${metric.bucketId}: ${fieldName} unavailable value cannot have a USD amount`,
    );
  }

  const maybeSource = metric.sources[fieldName];
  if (
    maybeSource?.provider === "StockAnalysis" &&
    maybeMoney.reportedCurrency !== "USD" &&
    maybeMoney.usdAmount === null &&
    !metric.flags.includes(flagForUnavailableConversion(fieldName))
  ) {
    errors.push(
      `${metric.bucketId}: ${fieldName} is non-USD StockAnalysis data without conversion or explicit failure flag`,
    );
  }
}

export function validateDatasetSemantics(dataset: CompaniesDataset): void {
  const errors: string[] = [];

  for (const company of dataset.companies) {
    for (const metric of company.metrics) {
      validateMoney(metric, "marketCap", errors);
      validateMoney(metric, "revenue", errors);

      if (
        metric.revenuePerEmployeeUsd !== null &&
        (metric.revenueUsd === null ||
          metric.employeeCount === null ||
          metric.employeeCount <= 0)
      ) {
        errors.push(
          `${company.symbol} ${metric.bucketId}: revenuePerEmployeeUsd requires revenueUsd and employeeCount`,
        );
      }

      if (
        metric.revenueUsd !== null &&
        metric.revenue?.usdAmount === null
      ) {
        errors.push(
          `${company.symbol} ${metric.bucketId}: revenueUsd is set without comparable revenue metadata`,
        );
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Dataset semantic validation failed:\n${errors
        .slice(0, 25)
        .map((error) => `- ${error}`)
        .join("\n")}`,
    );
  }
}

export async function validatePublicDataset(): Promise<void> {
  const publicPath = path.resolve("public", "data", "companies-data.json");
  const text = await fs.readFile(publicPath, "utf8");
  const parsed = JSON.parse(text);
  const dataset = datasetSchema.parse(parsed) as CompaniesDataset;
  validateDatasetSemantics(dataset);
  console.log(`Validated dataset: ${publicPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validatePublicDataset().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
