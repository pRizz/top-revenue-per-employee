import { createMemo, createResource, createSignal, Show } from "solid-js";

import { CompaniesTable } from "@/components/dashboard/companies-table";
import { HeroInfographic } from "@/components/dashboard/hero-infographic";
import { RevenuePerEmployeeChart } from "@/components/dashboard/revenue-per-employee-chart";
import { SourceAttributionPanel } from "@/components/dashboard/source-attribution-panel";
import { TimeBucketSelector } from "@/components/dashboard/time-bucket-selector";
import { getDataset } from "@/lib/data-client";
import { median } from "@/lib/metrics";
import { selectMetricForBucket } from "@/lib/time-buckets";

export function DashboardPage() {
  const [dataset] = createResource(getDataset);
  const [selectedBucketId, setSelectedBucketId] = createSignal<string>("");

  const bucketIds = createMemo(() => dataset()?.bucketIds ?? []);

  const rows = createMemo(() => {
    const maybeDataset = dataset();
    if (!maybeDataset || !selectedBucketId()) {
      return [];
    }

    return maybeDataset.companies.map((company) => ({
      company,
      metric: selectMetricForBucket(company.metrics, selectedBucketId()),
    }));
  });

  const topEntry = createMemo(() => {
    return [...rows()]
      .filter((row) => row.metric?.revenuePerEmployeeUsd !== null)
      .sort(
        (left, right) =>
          (right.metric?.revenuePerEmployeeUsd ?? 0) -
          (left.metric?.revenuePerEmployeeUsd ?? 0),
      )[0];
  });

  const medianRevenuePerEmployee = createMemo(() => {
    const values = rows()
      .map((row) => row.metric?.revenuePerEmployeeUsd ?? null)
      .filter((maybeValue): maybeValue is number => maybeValue !== null);

    return median(values);
  });

  const companiesWithMetricCount = createMemo(
    () =>
      rows().filter((row) => row.metric?.revenuePerEmployeeUsd !== null).length,
  );

  const topChartItems = createMemo(() =>
    rows()
      .filter((row) => row.metric?.revenuePerEmployeeUsd !== null)
      .sort(
        (left, right) =>
          (right.metric?.revenuePerEmployeeUsd ?? 0) -
          (left.metric?.revenuePerEmployeeUsd ?? 0),
      )
      .slice(0, 10)
      .map((row) => ({
        label: row.company.symbol,
        value: row.metric?.revenuePerEmployeeUsd ?? 0,
      })),
  );

  if (!selectedBucketId() && bucketIds().length > 0) {
    setSelectedBucketId(bucketIds()[0]);
  }

  return (
    <main class="container space-y-4 py-6">
      <h1 class="text-2xl font-bold tracking-tight">
        Top companies by revenue per employee
      </h1>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Explore how efficiently the world&apos;s largest public companies turn
        headcount into revenue. Sort the table and switch buckets to compare
        annual and quarterly snapshots.
      </p>

      <Show when={dataset()} fallback={<p>Loading dataset…</p>}>
        <HeroInfographic
          leaderName={topEntry()?.company.name ?? "No data"}
          leaderRevenuePerEmployee={topEntry()?.metric?.revenuePerEmployeeUsd ?? null}
          medianRevenuePerEmployee={medianRevenuePerEmployee()}
          companiesWithMetricCount={companiesWithMetricCount()}
        />
        <RevenuePerEmployeeChart items={topChartItems()} />

        <div class="grid gap-4 lg:grid-cols-[240px_1fr]">
          <div class="space-y-3">
            <TimeBucketSelector
              bucketIds={bucketIds()}
              selectedBucketId={selectedBucketId()}
              onChange={setSelectedBucketId}
            />
            <SourceAttributionPanel generatedAt={dataset()!.generatedAt} />
          </div>
          <CompaniesTable rows={rows()} />
        </div>
      </Show>
    </main>
  );
}
