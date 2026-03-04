import fs from "node:fs/promises";
import path from "node:path";

import type { NormalizedDataset } from "./types";

function snapshotDirectoryName(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function prepareArchiveDirectories(now: Date): Promise<{
  snapshotDirectory: string;
}> {
  const snapshotDirectory = path.resolve(
    "data",
    "raw",
    snapshotDirectoryName(now),
  );
  await fs.mkdir(snapshotDirectory, { recursive: true });
  await fs.mkdir(path.resolve("data", "processed"), { recursive: true });

  return { snapshotDirectory };
}

export async function writeUniverseRawSnapshot(
  snapshotDirectory: string,
  raw: {
    rankingCsv: string;
    employeesCsv: string;
    rankingHtml: string;
  },
): Promise<void> {
  await fs.writeFile(
    path.join(snapshotDirectory, "companies-marketcap-ranking.csv"),
    raw.rankingCsv,
    "utf8",
  );
  await fs.writeFile(
    path.join(snapshotDirectory, "companies-marketcap-employees.csv"),
    raw.employeesCsv,
    "utf8",
  );
  await fs.writeFile(
    path.join(snapshotDirectory, "companies-marketcap-ranking.html"),
    raw.rankingHtml,
    "utf8",
  );
}

export async function writeStockAnalysisRawSnapshot(
  snapshotDirectory: string,
  payload: {
    enrichment: unknown;
    routeResolverStats: unknown;
  },
): Promise<void> {
  await fs.writeFile(
    path.join(snapshotDirectory, "stockanalysis-enrichment.json"),
    JSON.stringify(payload.enrichment, null, 2),
    "utf8",
  );
  await fs.writeFile(
    path.join(snapshotDirectory, "stockanalysis-route-resolver.json"),
    JSON.stringify(payload.routeResolverStats, null, 2),
    "utf8",
  );
}

export async function writeProcessedSnapshot(
  dataset: NormalizedDataset,
  metadata: Record<string, unknown>,
): Promise<void> {
  await fs.writeFile(
    path.resolve("data", "processed", "companies-timeseries.json"),
    JSON.stringify(dataset, null, 2),
    "utf8",
  );
  await fs.writeFile(
    path.resolve("data", "processed", "metadata.json"),
    JSON.stringify(metadata, null, 2),
    "utf8",
  );
}
