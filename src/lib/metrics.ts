export function computeRevenuePerEmployee(
  maybeRevenueUsd: number | null,
  maybeEmployeeCount: number | null,
): number | null {
  if (
    maybeRevenueUsd === null ||
    maybeEmployeeCount === null ||
    maybeEmployeeCount <= 0
  ) {
    return null;
  }

  return maybeRevenueUsd / maybeEmployeeCount;
}

export function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}
