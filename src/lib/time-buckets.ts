import type {
  BucketType,
  DatasetBucket,
  MetricRecord,
} from "@/types/company-data";

export function bucketTypeFromId(bucketId: string): BucketType {
  if (bucketId.endsWith("TTM")) {
    return "ttm";
  }

  return bucketId.includes("Q") ? "quarterly" : "annual";
}

export function sortBucketIds(bucketIds: string[]): string[] {
  return [...bucketIds].sort((left, right) => {
    if (left === right) {
      return 0;
    }

    const [leftYearText, leftQuarterText] = left.split("Q");
    const [rightYearText, rightQuarterText] = right.split("Q");
    const leftYear = Number(leftYearText);
    const rightYear = Number(rightYearText);
    if (leftYear !== rightYear) {
      return rightYear - leftYear;
    }

    const leftTypeWeight = left.endsWith("TTM")
      ? 6
      : leftQuarterText
        ? Number(leftQuarterText)
        : 5;
    const rightTypeWeight = right.endsWith("TTM")
      ? 6
      : rightQuarterText
        ? Number(rightQuarterText)
        : 5;
    return rightTypeWeight - leftTypeWeight;
  });
}

export function sortBuckets(buckets: DatasetBucket[]): DatasetBucket[] {
  const orderById = new Map(
    sortBucketIds(buckets.map((bucket) => bucket.id)).map((bucketId, index) => [
      bucketId,
      index,
    ]),
  );

  return [...buckets].sort(
    (left, right) =>
      (orderById.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (orderById.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function selectMetricForBucket(
  metrics: MetricRecord[],
  bucketId: string,
): MetricRecord | undefined {
  return metrics.find((entry) => entry.bucketId === bucketId);
}
