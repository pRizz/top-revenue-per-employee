interface SourceAttributionPanelProps {
  generatedAt: string;
}

export function SourceAttributionPanel(
  props: SourceAttributionPanelProps,
) {
  return (
    <aside class="rounded-xl border bg-card p-4 shadow-soft">
      <h3 class="mb-2 text-sm font-semibold">Data sources</h3>
      <ul class="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
        <li>
          <a
            href="https://companiesmarketcap.com/"
            class="underline decoration-dotted underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            CompaniesMarketCap
          </a>{" "}
          — top universe + ranking + employee fallback snapshot.
        </li>
        <li>
          <a
            href="https://stockanalysis.com/"
            class="underline decoration-dotted underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            StockAnalysis
          </a>{" "}
          — annual/quarterly revenue, market-cap history, employee history,
          plus original reporting currencies.
        </li>
      </ul>
      <p class="mt-3 text-xs text-muted-foreground">
        Comparable money values are shown in USD. When a source reports in a
        local currency, the dataset stores the original amount, tracks the
        reporting period, and normalizes it for ranking and charting.
      </p>
      <p class="mt-3 text-xs text-muted-foreground">
        TTM buckets are labeled separately from annual buckets. Where historical
        employee or market-cap coverage is missing, the table flags snapshot
        fallbacks so the comparison stays explicit about its confidence level.
      </p>
      <p class="mt-3 text-xs text-muted-foreground">
        Last refreshed: {new Date(props.generatedAt).toLocaleString()}
      </p>
    </aside>
  );
}
