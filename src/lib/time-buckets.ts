import type { BucketType, MetricRecord } from "@/types/company-data";

export function bucketTypeFromId(bucketId: string): BucketType {
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

    const leftQuarter = leftQuarterText ? Number(leftQuarterText) : 5;
    const rightQuarter = rightQuarterText ? Number(rightQuarterText) : 5;
    return rightQuarter - leftQuarter;
  });
}

export function selectMetricForBucket(
  metrics: MetricRecord[],
  bucketId: string,
): MetricRecord | undefined {
  return metrics.find((entry) => entry.bucketId === bucketId);
}
