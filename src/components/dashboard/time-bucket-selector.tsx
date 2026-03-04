interface TimeBucketSelectorProps {
  bucketIds: string[];
  selectedBucketId: string;
  onChange: (bucketId: string) => void;
}

export function TimeBucketSelector(props: TimeBucketSelectorProps) {
  return (
    <div class="rounded-lg border bg-card p-3 shadow-sm">
      <label class="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Time bucket
      </label>
      <select
        class="w-full rounded-md border bg-white px-3 py-2 text-sm"
        value={props.selectedBucketId}
        onChange={(event) => props.onChange(event.currentTarget.value)}
      >
        {props.bucketIds.map((bucketId) => (
          <option value={bucketId}>{bucketId}</option>
        ))}
      </select>
    </div>
  );
}
