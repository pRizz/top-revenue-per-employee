import type {
  CompanyRecord,
  DatasetBucket,
} from "@/types/company-data";

import { createEffect, createMemo, createSignal } from "solid-js";
import { bucketTypeFromId } from "@/lib/time-buckets";

interface ComparisonControlsProps {
  companies: CompanyRecord[];
  selectedCompanyIds: string[];
  selectedBucketId: string;
  buckets: DatasetBucket[];
  onBucketChange: (bucketId: string) => void;
  onToggleCompany: (companyId: string) => void;
}

export function ComparisonControls(props: ComparisonControlsProps) {
  const [selectedBucketType, setSelectedBucketType] = createSignal<
    "annual" | "quarterly" | "ttm"
  >(
    bucketTypeFromId(props.selectedBucketId),
  );
  const activeBucketTypeClasses = "bg-card text-foreground shadow-sm";
  const inactiveBucketTypeClasses = "text-muted-foreground";

  const filteredBuckets = createMemo(() =>
    props.buckets.filter(
      (bucket) => bucket.bucketType === selectedBucketType(),
    ),
  );

  createEffect(() => {
    if (!props.selectedBucketId) {
      return;
    }

    setSelectedBucketType(bucketTypeFromId(props.selectedBucketId));
  });

  createEffect(() => {
    const maybeSelectedStillVisible = filteredBuckets().some(
      (bucket) => bucket.id === props.selectedBucketId,
    );
    if (maybeSelectedStillVisible) {
      return;
    }

    const maybeFallbackBucket = filteredBuckets()[0];
    if (maybeFallbackBucket) {
      props.onBucketChange(maybeFallbackBucket.id);
    }
  });

  return (
    <section class="grid gap-4 rounded-xl border bg-card p-4 shadow-soft lg:grid-cols-[220px_1fr]">
      <div>
        <label class="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Bucket
        </label>
        <div class="mb-2 inline-flex rounded-md border bg-muted p-1 text-xs">
          <button
            class={`rounded px-2 py-1 ${
              selectedBucketType() === "annual"
                ? activeBucketTypeClasses
                : inactiveBucketTypeClasses
            }`}
            onClick={() => setSelectedBucketType("annual")}
            type="button"
          >
            Annual
          </button>
          <button
            class={`rounded px-2 py-1 ${
              selectedBucketType() === "ttm"
                ? activeBucketTypeClasses
                : inactiveBucketTypeClasses
            }`}
            onClick={() => setSelectedBucketType("ttm")}
            type="button"
          >
            TTM
          </button>
          <button
            class={`rounded px-2 py-1 ${
              selectedBucketType() === "quarterly"
                ? activeBucketTypeClasses
                : inactiveBucketTypeClasses
            }`}
            onClick={() => setSelectedBucketType("quarterly")}
            type="button"
          >
            Quarterly
          </button>
        </div>
        <select
          class="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={props.selectedBucketId}
          onChange={(event) => props.onBucketChange(event.currentTarget.value)}
        >
          {filteredBuckets().map((bucket) => (
            <option value={bucket.id}>{bucket.label}</option>
          ))}
        </select>
      </div>

      <div>
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Compare companies
        </p>
        <div class="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-2 md:grid-cols-3 lg:grid-cols-4">
          {props.companies.map((company) => (
            <label class="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={props.selectedCompanyIds.includes(company.id)}
                onChange={() => props.onToggleCompany(company.id)}
              />
              <span>{company.symbol}</span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
