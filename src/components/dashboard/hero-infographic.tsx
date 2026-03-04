import { Crown, Users, Wallet } from "lucide-solid";

import { formatInteger, formatUsd } from "@/lib/formatters";

interface HeroInfographicProps {
  leaderName: string;
  leaderRevenuePerEmployee: number | null;
  medianRevenuePerEmployee: number | null;
  companiesWithMetricCount: number;
}

export function HeroInfographic(props: HeroInfographicProps) {
  return (
    <section class="grid gap-3 md:grid-cols-3">
      <article class="rounded-xl border bg-card p-4 shadow-soft">
        <p class="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
          Top revenue / employee
        </p>
        <div class="mb-2 flex items-center gap-2">
          <Crown class="h-4 w-4 text-primary" />
          <h2 class="text-lg font-semibold">{props.leaderName}</h2>
        </div>
        <p class="text-2xl font-bold text-primary">
          {formatUsd(props.leaderRevenuePerEmployee)}
        </p>
      </article>

      <article class="rounded-xl border bg-card p-4 shadow-soft">
        <p class="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
          Median revenue / employee
        </p>
        <div class="mb-2 flex items-center gap-2">
          <Wallet class="h-4 w-4 text-primary" />
          <h2 class="text-lg font-semibold">Across visible companies</h2>
        </div>
        <p class="text-2xl font-bold">{formatUsd(props.medianRevenuePerEmployee)}</p>
      </article>

      <article class="rounded-xl border bg-card p-4 shadow-soft">
        <p class="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
          Coverage
        </p>
        <div class="mb-2 flex items-center gap-2">
          <Users class="h-4 w-4 text-primary" />
          <h2 class="text-lg font-semibold">Companies with this metric</h2>
        </div>
        <p class="text-2xl font-bold">{formatInteger(props.companiesWithMetricCount)}</p>
      </article>
    </section>
  );
}
