import { createEffect, createMemo, createSignal } from "solid-js";

interface TimeBucketSelectorProps {
  bucketIds: string[];
  selectedBucketId: string;
  onChange: (bucketId: string) => void;
}

export function TimeBucketSelector(props: TimeBucketSelectorProps) {
  const [selectedBucketType, setSelectedBucketType] = createSignal<"annual" | "quarterly">(
    props.selectedBucketId.includes("Q") ? "quarterly" : "annual",
  );

  const filteredBucketIds = createMemo(() =>
    props.bucketIds.filter((bucketId) =>
      selectedBucketType() === "annual"
        ? !bucketId.includes("Q")
        : bucketId.includes("Q"),
    ),
  );

  createEffect(() => {
    const maybeSelectedStillVisible = filteredBucketIds().includes(
      props.selectedBucketId,
    );
    if (maybeSelectedStillVisible) {
      return;
    }

    const maybeFallbackBucketId = filteredBucketIds()[0];
    if (maybeFallbackBucketId) {
      props.onChange(maybeFallbackBucketId);
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
            selectedBucketType() === "annual" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
          }`}
          onClick={() => setSelectedBucketType("annual")}
          type="button"
        >
          Annual
        </button>
        <button
          class={`rounded px-2 py-1 ${
            selectedBucketType() === "quarterly"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
          onClick={() => setSelectedBucketType("quarterly")}
          type="button"
        >
          Quarterly
        </button>
      </div>
      <select
        class="w-full rounded-md border bg-white px-3 py-2 text-sm"
        value={props.selectedBucketId}
        onChange={(event) => props.onChange(event.currentTarget.value)}
      >
        {filteredBucketIds().map((bucketId) => (
          <option value={bucketId}>{bucketId}</option>
        ))}
      </select>
    </div>
  );
}
