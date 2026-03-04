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
          — annual/quarterly revenue, market-cap history, employee history.
        </li>
      </ul>
      <p class="mt-3 text-xs text-muted-foreground">
        Last refreshed: {new Date(props.generatedAt).toLocaleString()}
      </p>
    </aside>
  );
}
