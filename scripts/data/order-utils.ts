export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const workerCount = Math.max(1, concurrency);
  const queue = [...items.entries()];
  const results = new Array<R>(items.length);

  const runners = Array.from({ length: workerCount }, async () => {
    while (queue.length > 0) {
      const maybeNext = queue.shift();
      if (!maybeNext) {
        return;
      }

      const [index, item] = maybeNext;
      results[index] = await worker(item, index);
    }
  });

  await Promise.all(runners);
  return results;
}

export function sortBySymbol<T extends { symbol: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((left, right) => left.symbol.localeCompare(right.symbol));
}
