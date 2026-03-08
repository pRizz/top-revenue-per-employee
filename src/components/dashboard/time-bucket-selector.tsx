import { createEffect, createMemo, createSignal } from "solid-js";
import type { DatasetBucket } from "@/types/company-data";
import { bucketTypeFromId } from "@/lib/time-buckets";

interface TimeBucketSelectorProps {
  buckets: DatasetBucket[];
  selectedBucketId: string;
  onChange: (bucketId: string) => void;
}

export function TimeBucketSelector(props: TimeBucketSelectorProps) {
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
      props.onChange(maybeFallbackBucket.id);
    }
  });

  return (
    <div class="rounded-lg border bg-card p-3 shadow-sm">
      <label class="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Time bucket
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
        onChange={(event) => props.onChange(event.currentTarget.value)}
      >
        {filteredBuckets().map((bucket) => (
          <option value={bucket.id}>{bucket.label}</option>
        ))}
      </select>
    </div>
  );
}
