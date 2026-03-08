import { createMemo, createResource, createSignal, Show } from "solid-js";

import { ComparisonControls } from "@/components/playground/comparison-controls";
import {
  type ComparisonPoint,
  visualizationRegistry,
} from "@/components/playground/charts/visualization-registry";
import { getDataset } from "@/lib/data-client";
import {
  describeMoneyNormalization,
  formatComparableMoney,
  formatInteger,
  formatReportedMoney,
  formatUsd,
} from "@/lib/formatters";
import { selectMetricForBucket } from "@/lib/time-buckets";

export function PlaygroundPage() {
  const [dataset] = createResource(getDataset);
  const [selectedBucketId, setSelectedBucketId] = createSignal<string>("");
  const [selectedCompanyIds, setSelectedCompanyIds] = createSignal<string[]>([]);

  const companies = createMemo(() => dataset()?.companies ?? []);
  const bucketIds = createMemo(() => dataset()?.bucketIds ?? []);

  if (!selectedBucketId() && bucketIds().length > 0) {
    setSelectedBucketId(bucketIds()[0]);
  }

  if (selectedCompanyIds().length === 0 && companies().length > 0) {
    setSelectedCompanyIds(companies().slice(0, 3).map((company) => company.id));
  }

  const comparisonPoints = createMemo<ComparisonPoint[]>(() => {
    return companies()
      .filter((company) => selectedCompanyIds().includes(company.id))
      .flatMap((company) => {
        const maybeMetric = selectMetricForBucket(company.metrics, selectedBucketId());
        if (
          !maybeMetric ||
          maybeMetric.marketCap === null ||
          maybeMetric.revenue === null ||
          maybeMetric.marketCapUsd === null ||
          maybeMetric.revenuePerEmployeeUsd === null ||
          maybeMetric.employeeCount === null
        ) {
          return [];
        }

        return [
          {
            label: company.symbol,
            marketCapUsd: maybeMetric.marketCapUsd,
            revenuePerEmployeeUsd: maybeMetric.revenuePerEmployeeUsd,
            employeeCount: maybeMetric.employeeCount,
            marketCap: maybeMetric.marketCap,
            revenue: maybeMetric.revenue,
          },
        ];
      });
  });

  const toggleCompany = (companyId: string): void => {
    setSelectedCompanyIds((previousCompanyIds) => {
      if (previousCompanyIds.includes(companyId)) {
        return previousCompanyIds.filter((item) => item !== companyId);
      }

      return [...previousCompanyIds, companyId];
    });
  };

  return (
    <main class="container space-y-4 py-6">
      <h1 class="text-2xl font-bold tracking-tight">Comparison playground</h1>
      <p class="max-w-3xl text-sm text-muted-foreground">
        Select two or more companies and compare them using pluggable
        visualizations. Bubble size is employee count, and vertical position is
        revenue per employee.
      </p>

      <Show when={dataset()} fallback={<p>Loading dataset…</p>}>
        <ComparisonControls
          companies={companies()}
          selectedCompanyIds={selectedCompanyIds()}
          selectedBucketId={selectedBucketId()}
          bucketIds={bucketIds()}
          onBucketChange={setSelectedBucketId}
          onToggleCompany={toggleCompany}
        />

        {visualizationRegistry[0].render(comparisonPoints())}

        <div class="overflow-hidden rounded-xl border bg-card shadow-soft">
          <table class="w-full border-collapse text-sm">
            <thead class="bg-muted">
              <tr>
                <th class="px-3 py-2 text-left">Company</th>
                <th class="px-3 py-2 text-left">Market cap</th>
                <th class="px-3 py-2 text-left">Revenue / employee</th>
                <th class="px-3 py-2 text-left">Employees</th>
              </tr>
            </thead>
            <tbody>
              {comparisonPoints().map((point) => (
                <tr class="border-t">
                  <td class="px-3 py-2 font-medium">{point.label}</td>
                  <td class="px-3 py-2">
                    <div class="flex flex-col gap-1">
                      <span>{formatComparableMoney(point.marketCap)}</span>
                      {point.marketCap.reportedCurrency !== "USD" ? (
                        <span class="text-xs text-muted-foreground">
                          Reported: {formatReportedMoney(point.marketCap)}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex flex-col gap-1">
                      <span>{formatUsd(point.revenuePerEmployeeUsd)}</span>
                      {describeMoneyNormalization(point.revenue) ? (
                        <span class="text-xs text-muted-foreground">
                          Revenue {describeMoneyNormalization(point.revenue)}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td class="px-3 py-2">{formatInteger(point.employeeCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Show>
    </main>
  );
}
