import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const bucketIdSchema = z.string().regex(/^\d{4}(Q[1-4])?$/);

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
          marketCapUsd: z.number().nonnegative().nullable(),
          revenueUsd: z.number().nonnegative().nullable(),
          employeeCount: z.number().positive().nullable(),
          revenuePerEmployeeUsd: z.number().nonnegative().nullable(),
          sources: z.object({
            marketCap: z
              .object({
                provider: z.string(),
                url: z.string(),
                fetchedAt: z.string(),
              })
              .optional(),
            revenue: z
              .object({
                provider: z.string(),
                url: z.string(),
                fetchedAt: z.string(),
              })
              .optional(),
            employeeCount: z
              .object({
                provider: z.string(),
                url: z.string(),
                fetchedAt: z.string(),
              })
              .optional(),
          }),
          flags: z.array(z.string()),
        }),
      ),
    }),
  ),
});

export async function validatePublicDataset(): Promise<void> {
  const publicPath = path.resolve("public", "data", "companies-data.json");
  const text = await fs.readFile(publicPath, "utf8");
  const parsed = JSON.parse(text);
  datasetSchema.parse(parsed);
  console.log(`Validated dataset: ${publicPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validatePublicDataset().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
