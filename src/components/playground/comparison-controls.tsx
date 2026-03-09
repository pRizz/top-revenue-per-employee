import type {
  CompanyRecord,
  DatasetBucket,
} from "@/types/company-data";

import { createEffect, createMemo, createSignal } from "solid-js";
import {
  buildCompanyComparisonGroups,
  companyComparisonGroupCategories,
} from "@/lib/company-comparison-groups";
import { bucketTypeFromId } from "@/lib/time-buckets";
import { cn } from "@/lib/utils";

interface ComparisonControlsProps {
  companies: CompanyRecord[];
  selectedCompanyIds: string[];
  selectedBucketId: string;
  buckets: DatasetBucket[];
  onBucketChange: (bucketId: string) => void;
  onSelectCompanyIds: (companyIds: string[]) => void;
  onToggleCompany: (companyId: string) => void;
}

function hasSameCompanies(leftCompanyIds: string[], rightCompanyIds: string[]): boolean {
  if (leftCompanyIds.length !== rightCompanyIds.length) {
    return false;
  }

  const rightCompanyIdSet = new Set(rightCompanyIds);
  return leftCompanyIds.every((companyId) => rightCompanyIdSet.has(companyId));
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
  const companyGroups = createMemo(() =>
    buildCompanyComparisonGroups(props.companies),
  );
  const groupedCompanyPresets = createMemo(() =>
    companyComparisonGroupCategories
      .map((category) => ({
        ...category,
        groups: companyGroups().filter((group) => group.category === category.id),
      }))
      .filter((category) => category.groups.length > 0),
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
        <div class="mb-2 flex items-center justify-between gap-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Compare companies
          </p>
          <p class="text-xs text-muted-foreground">
            {props.selectedCompanyIds.length} selected
          </p>
        </div>
        <div class="mb-4 space-y-3">
          <p class="text-xs text-muted-foreground">
            Quick-select a preset, then fine-tune with the checkboxes below.
          </p>
          {groupedCompanyPresets().map((category) => (
            <div class="space-y-2">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {category.label}
              </p>
              <div class="flex flex-wrap gap-2">
                {category.groups.map((group) => {
                  const isSelected = hasSameCompanies(
                    group.companyIds,
                    props.selectedCompanyIds,
                  );

                  return (
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      class={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background text-foreground hover:bg-muted",
                      )}
                      onClick={() => props.onSelectCompanyIds(group.companyIds)}
                      title={`${group.description} (${group.companySymbols.join(", ")})`}
                    >
                      <span>{group.label}</span>
                      <span
                        class={cn(
                          "rounded-full px-1.5 py-0.5 text-[11px]",
                          isSelected
                            ? "bg-primary-foreground/15 text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {group.companyIds.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <p class="text-xs text-muted-foreground">
            S&amp;P presets use the highest-ranked United States companies
            currently available in this dataset.
          </p>
        </div>
        <div class="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-2 md:grid-cols-3 lg:grid-cols-4">
          {props.companies.map((company) => (
            <label class="flex items-center gap-2 text-xs" title={company.name}>
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
