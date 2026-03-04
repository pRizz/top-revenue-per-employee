import { formatUsd } from "@/lib/formatters";

interface RevenuePerEmployeeChartItem {
  label: string;
  value: number;
}

interface RevenuePerEmployeeChartProps {
  items: RevenuePerEmployeeChartItem[];
}

export function RevenuePerEmployeeChart(props: RevenuePerEmployeeChartProps) {
  if (props.items.length === 0) {
    return (
      <div class="rounded-xl border bg-card p-4 shadow-soft">
        <p class="text-sm text-muted-foreground">
          No comparable revenue-per-employee values for this bucket.
        </p>
      </div>
    );
  }

  const topValue = Math.max(...props.items.map((item) => item.value));

  return (
    <section class="rounded-xl border bg-card p-4 shadow-soft">
      <div class="mb-3 flex items-baseline justify-between gap-3">
        <h3 class="text-sm font-semibold">Top 10 revenue / employee</h3>
        <p class="text-xs text-muted-foreground">
          Visualized for the currently selected time bucket
        </p>
      </div>
      <div class="space-y-2">
        {props.items.map((item) => (
          <div class="grid grid-cols-[120px_1fr_120px] items-center gap-3 text-xs">
            <p class="truncate font-medium">{item.label}</p>
            <div class="h-3 rounded bg-muted">
              <div
                class="h-3 rounded bg-primary"
                style={{ width: `${Math.max((item.value / topValue) * 100, 2)}%` }}
              />
            </div>
            <p class="text-right font-semibold text-primary">{formatUsd(item.value)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
